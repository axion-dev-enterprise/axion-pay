import { config } from "../config/env.js";
import { createClient } from "@supabase/supabase-js";
import { createUser, getUserByEmail, getUserByWhatsapp, getUserById, createApiKey, updateUserStatus } from "../models/userStore.js";
import { sendEmail } from "../utils/mailer.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

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
    throw new Error("Dados obrigatorios ausentes.");
  }
}

export async function signupHandler(req, res, next) {
  try {
    const { name, email, password, cpf, company, cnpj, whatsapp } = req.body || {};
    if (!name || !email || !password || !cpf || !company) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    const supabase = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return res.status(400).json({ ok: false, error: error.message });

    const legacyUser = createUser({
      name: String(name).trim(),
      email,
      whatsapp: String(whatsapp || "").trim(),
      passwordHash: hashPassword(password),
      cpf: String(cpf).trim(),
      company: String(company).trim(),
      cnpj: sanitizeCnpj(cnpj),
      emailVerified: false,
      role: "user"
    });

    const apiKey = createApiKey({ userId: legacyUser.id, label: "sandbox" });
    return res.status(201).json({ ok: true, user: legacyUser, api_key: apiKey?.key, status: legacyUser.status });
  } catch (err) {
    return next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const { identifier, password } = req.body || {};
    const trimmedIdentifier = String(identifier || "").trim();
    if (!trimmedIdentifier) return res.status(400).json({ ok: false, error: "identifier_required" });

    const supabase = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const isEmail = trimmedIdentifier.includes("@");
    let providerEmail = isEmail ? trimmedIdentifier : `${trimmedIdentifier}@clients.pay.axionenterprise.cloud`;
    if (!isEmail && trimmedIdentifier.length >= 8) {
      const existing = getUserByWhatsapp(trimmedIdentifier);
      if (existing?.email) providerEmail = existing.email;
    }

    let session = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email: providerEmail, password });
      session = result?.data?.session || null;
      if (result?.error && result.error.message?.includes("Invalid")) session = null;
    } catch {}

    if (!session) {
      const legacyUser = isEmail ? getUserByEmailWithPassword(providerEmail) : getUserByWhatsappWithPassword(trimmedIdentifier);
      if (!legacyUser || !verifyPassword(password, legacyUser.password_hash)) {
        return res.status(401).json({ ok: false, error: "invalid_credentials" });
      }
      const user = getUserById(legacyUser.id);
      if (["rejected", "suspended"].includes(user.status)) {
        return res.status(403).json({ ok: false, error: "account_not_allowed" });
      }
      const ttlMs = config.sessions.ttlDays * 24 * 60 * 60 * 1000;
      const token = createSession({ userId: user.id, expiresAt: new Date(Date.now() + ttlMs).toISOString() });
      res.cookie("axionpay_session", token, { maxAge: ttlMs, httpOnly: true, secure: config.env === "production", sameSite: config.env === "production" ? "None" : "Lax", path: "/" });
      return res.json({ ok: true, token, user });
    }

    res.cookie("axion_token", session.access_token, { httpOnly: false, secure: config.env === "production", sameSite: config.env === "production" ? "None" : "Lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });
    return res.json({ ok: true, token: session.access_token, user: { email: providerEmail } });
  } catch (err) {
    return next(err);
  }
}
