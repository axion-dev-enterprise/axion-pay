import { config } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { isValidCpf, normalizeCpf } from "../utils/cpf.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { randomUUID } from "node:crypto";
import { normalizeWhatsapp } from "../utils/validation.js";
import {
  createApiKey,
  createEmailToken,
  createSession,
  consumeEmailToken,
  getUserByEmail,
  getUserByEmailWithPassword,
  getUserById,
  getUserByWhatsapp,
  getUserByWhatsappWithPassword,
  listApiKeys,
  revokeApiKey,
  revokeSession,
  setEmailVerified,
  createUser,
  markDocsSent,
  getUserDefaultPayoutDestination,
  setUserDefaultPayoutDestination
} from "../models/userStore.js";
import { sendEmail } from "../utils/mailer.js";

const EMAIL_TOKEN_HOURS = 24;

function buildConfirmUrl(token) {
  const base = config.email.confirmBaseUrl || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/confirmacao?token=${encodeURIComponent(token)}`;
}

function buildDocsUrl() {
  return config.email.docsUrl || "http://localhost:3060/api";
}

function sanitizeCnpj(value) {
  return String(value || "").replace(/\D/g, "");
}

function validateSignupInput({ name, email, password, cpf, company, cnpj }) {
  if (!name || !email || !password || !cpf || !company || !cnpj) {
    throw new AppError("Dados obrigatorios ausentes.", 400, "invalid_request");
  }
  if (!isValidCpf(cpf)) {
    throw new AppError("CPF invalido.", 400, "invalid_cpf");
  }
  const cnpjDigits = sanitizeCnpj(cnpj);
  if (cnpjDigits.length !== 14) {
    throw new AppError("CNPJ invalido.", 400, "invalid_cnpj");
  }
}

export async function signupHandler(req, res, next) {
  try {
    const { name, cpf, whatsapp, password } = req.body;
    const normalizedCpf = normalizeCpf(cpf);
    if (!isValidCpf(normalizedCpf)) {
      throw new AppError("CPF invalido.", 400, "invalid_cpf");
    }
    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
    if (!normalizedWhatsapp || normalizedWhatsapp.length < 8) {
      throw new AppError("WhatsApp invalido.", 400, "invalid_whatsapp");
    }

    const existing = getUserByWhatsapp(normalizedWhatsapp);
    if (existing) {
      throw new AppError("WhatsApp ja cadastrado.", 409, "whatsapp_in_use");
    }

    const passwordHash = hashPassword(password);
    const fallbackEmail = `${normalizedWhatsapp || `client-${randomUUID()}`}@clients.pay.axionenterprise.cloud`;
    const user = createUser({
      name: String(name).trim(),
      email: fallbackEmail,
      whatsapp: normalizedWhatsapp,
      passwordHash,
      cpf: normalizedCpf,
      company: "Cliente AxionPay",
      cnpj: "",
      volume: null,
      emailVerified: true
    });

    const apiKey = createApiKey({ userId: user.id, label: "sandbox" });

    return res.status(201).json({
      ok: true,
      user,
      api_key: apiKey.key,
      status: user.status
    });
  } catch (err) {
    return next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const trimmedIdentifier = String(identifier || "").trim();
    if (!trimmedIdentifier) {
      throw new AppError("Informe WhatsApp ou e-mail.", 400, "invalid_request");
    }
    const isEmail = trimmedIdentifier.includes("@");
    let userRow;
    if (isEmail) {
      userRow = getUserByEmailWithPassword(trimmedIdentifier);
    } else {
      const normalizedWhatsapp = normalizeWhatsapp(trimmedIdentifier);
      if (!normalizedWhatsapp || normalizedWhatsapp.length < 8) {
        throw new AppError("WhatsApp invalido.", 400, "invalid_whatsapp");
      }
      userRow = getUserByWhatsappWithPassword(normalizedWhatsapp);
    }
    if (!userRow) {
      throw new AppError("Credenciais invalidas.", 401, "invalid_credentials");
    }
    const valid = verifyPassword(password, userRow.password_hash);
    if (!valid) {
      throw new AppError("Credenciais invalidas.", 401, "invalid_credentials");
    }
    const user = getUserById(userRow.id);
    // Removida verificação de email confirmado
    if (["rejected", "suspended"].includes(user.status)) {
      throw new AppError("Conta nao autorizada.", 403, "account_not_allowed");
    }

    const ttlMs = config.sessions.ttlDays * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const token = createSession({ userId: user.id, expiresAt });
    res.cookie("axionpay_session", token, {
      maxAge: ttlMs,
      httpOnly: true,
      secure: config.env === "production",
      sameSite: config.env === "production" ? "None" : "Lax",
      path: "/"
    });
    return res.json({ ok: true, token, user });
  } catch (err) {
    return next(err);
  }
}

export async function confirmEmailHandler(req, res, next) {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      throw new AppError("Token obrigatorio.", 400, "invalid_request");
    }
    const consumed = consumeEmailToken({ token, type: "verify_email" });
    if (!consumed) {
      throw new AppError("Token invalido ou expirado.", 400, "invalid_token");
    }
    const updated = setEmailVerified(consumed.user_id);
    return res.json({ ok: true, user: updated });
  } catch (err) {
    return next(err);
  }
}

export async function resendConfirmationHandler(req, res, next) {
  try {
    const { email } = req.body;
    const userRow = getUserByEmail(email);
    if (!userRow) {
      return res.json({ ok: true });
    }
    if (userRow.email_verified) {
      return res.json({ ok: true, already_verified: true });
    }

    const expiresAt = new Date(
      Date.now() + EMAIL_TOKEN_HOURS * 60 * 60 * 1000
    ).toISOString();
    const token = createEmailToken({
      userId: userRow.id,
      type: "verify_email",
      expiresAt
    });
    const confirmUrl = buildConfirmUrl(token);

    await sendEmail({
      to: userRow.email,
      subject: "Confirme sua conta AxionPAY",
      text: `Confirme sua conta acessando: ${confirmUrl}`,
      html: `<p>Confirme sua conta acessando:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p>`
    });

    return res.json({
      ok: true,
      ...(config.env !== "production" ? { confirm_url: confirmUrl } : {})
    });
  } catch (err) {
    return next(err);
  }
}

export async function meHandler(req, res, next) {
  try {
    const user = req.user;
    const keys = listApiKeys(user.id);
    return res.json({ ok: true, user, api_keys: keys });
  } catch (err) {
    return next(err);
  }
}

export async function createApiKeyHandler(req, res, next) {
  try {
    const user = req.user;
    const label = req.body?.label;
    const apiKey = createApiKey({ userId: user.id, label });
    return res.status(201).json({ ok: true, api_key: apiKey.key, api_key_meta: apiKey });
  } catch (err) {
    return next(err);
  }
}

export async function listApiKeysHandler(req, res, next) {
  try {
    const user = req.user;
    const keys = listApiKeys(user.id);
    return res.json({ ok: true, api_keys: keys });
  } catch (err) {
    return next(err);
  }
}

export async function revokeApiKeyHandler(req, res, next) {
  try {
    const user = req.user;
    const { id } = req.params;
    revokeApiKey({ userId: user.id, apiKeyId: id });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function getPayoutKeyHandler(req, res, next) {
  try {
    const destination = getUserDefaultPayoutDestination(req.user.id);
    return res.json({ ok: true, destination });
  } catch (err) {
    return next(err);
  }
}

export async function savePayoutKeyHandler(req, res, next) {
  try {
    const { destination } = req.body || {};
    const normalized = String(destination || "").trim();
    const updated = setUserDefaultPayoutDestination(req.user.id, normalized);
    return res.status(201).json({
      ok: true,
      destination: updated.defaultPayoutDestination
    });
  } catch (err) {
    return next(err);
  }
}

export async function logoutHandler(req, res, next) {
  try {
    if (req.sessionToken) {
      revokeSession(req.sessionToken);
    }
    res.clearCookie("axionpay_session", { path: "/" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function sendDocsHandler(req, res, next) {
  try {
    const user = req.user;
    const docsUrl = buildDocsUrl();
    await sendEmail({
      to: user.email,
      subject: "Documentacao AxionPAY",
      text: `Acesse a documentacao em: ${docsUrl}`,
      html: `<p>Acesse a documentacao em:</p><p><a href="${docsUrl}">${docsUrl}</a></p>`
    });
    const updated = markDocsSent(user.id);
    return res.json({ ok: true, user: updated });
  } catch (err) {
    return next(err);
  }
}
