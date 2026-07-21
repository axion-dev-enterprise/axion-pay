import { config } from "../config/env.js";
import {
  listUsers as listUsersStore,
  updateUserStatus,
  markDocsSent,
  listApiKeys,
  createApiKey,
  getUserById
} from "../models/userStore.js";
import { listAllTransactions } from "../models/transactionStore.js";
import {
  createPayTag,
  listAllPayTags,
  listPermissionsForTag,
  assignPermissionsToTag,
  findPayTagByName
} from "../models/payTagsStore.js";
import { listPermissions } from "../models/permissionStore.js";
import { sendEmail } from "../utils/mailer.js";

export function listTransactions(req, res) {
  const transactions = listAllTransactions();
  return res.json({ ok: true, transactions });
}

export function listUsers(req, res) {
  const { status, limit, offset } = req.query || {};
  const result = listUsersStore({
    status: status ? String(status).toLowerCase() : undefined,
    limit: limit ?? 50,
    offset: offset ?? 0
  });
  return res.json({ ok: true, ...result });
}

export function manageTags(req, res) {
  const tags = listAllPayTags();
  const tagsWithPermissions = tags.map((tag) => ({
    ...tag,
    permissions: listPermissionsForTag(tag.id)
  }));
  return res.json({ ok: true, tags: tagsWithPermissions });
}

export function listPermissionsHandler(req, res) {
  const permissions = listPermissions();
  return res.json({ ok: true, permissions });
}

export function createTagHandler(req, res, next) {
  try {
    const { tag, description } = req.body || {};
    const normalized = String(tag || "").trim();
    if (!normalized) {
      return res.status(400).json({
        ok: false,
        error: "Tag obrigatoria.",
        code: "invalid_request"
      });
    }
    const existing = findPayTagByName(normalized);
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "Tag ja existente.",
        code: "tag_exists"
      });
    }

    const newTag = createPayTag({
      userId: null,
      name: normalized,
      description: description?.trim() || null,
      webhookUrl: null
    });

    const requestedPermissions = Array.isArray(req.body.permissions)
      ? req.body.permissions.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const appliedPermissions = assignPermissionsToTag(newTag.id, requestedPermissions);

    return res.status(201).json({
      ok: true,
      tag: {
        ...newTag,
        permissions: appliedPermissions
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function maybeSendDocsEmail(user, notes, sendDocs) {
  if (!sendDocs) return;
  const docsUrl = config.email.docsUrl || "http://localhost:3000/api";
  await sendEmail({
    to: user.email,
    subject: "Documentacao AxionPAY",
    text: `Acesse a documentacao em: ${docsUrl}${notes ? `\n\nObservacoes: ${notes}` : ""}`,
    html: `<p>Acesse a documentacao em:</p><p><a href="${docsUrl}">${docsUrl}</a></p>${
      notes ? `<p>Observacoes: ${notes}</p>` : ""
    }`
  });
  markDocsSent(user.id);
}

export async function approveUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { notes, sendDocs } = req.body || {};
    const user = updateUserStatus(id, "approved", notes || null);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario nao encontrado.", code: "not_found" });
    }
    await maybeSendDocsEmail(user, notes, sendDocs);
    return res.json({ ok: true, user });
  } catch (err) {
    return next(err);
  }
}

export async function rejectUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    const user = updateUserStatus(id, "rejected", notes || null);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario nao encontrado.", code: "not_found" });
    }
    return res.json({ ok: true, user });
  } catch (err) {
    return next(err);
  }
}

export function storageInfoHandler(_req, res) {
  return res.json({
    ok: true,
    storagePath: config.storage.dataFile,
    storageRoot: config.storage.root
  });
}

export async function sendDocsToUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario nao encontrado.", code: "not_found" });
    }
    const { message } = req.body || {};
    await maybeSendDocsEmail(user, message, true);
    return res.json({ ok: true, user });
  } catch (err) {
    return next(err);
  }
}

export function listUserApiKeysHandler(req, res, next) {
  try {
    const { id } = req.params;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario nao encontrado.", code: "not_found" });
    }
    const api_keys = listApiKeys(user.id);
    return res.json({ ok: true, api_keys });
  } catch (err) {
    return next(err);
  }
}

export function createUserApiKeyHandler(req, res, next) {
  try {
    const { id } = req.params;
    const user = getUserById(id);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario nao encontrado.", code: "not_found" });
    }
    const { label } = req.body || {};
    const apiKey = createApiKey({ userId: user.id, label });
    return res.status(201).json({ ok: true, api_key: apiKey.key, api_key_meta: apiKey });
  } catch (err) {
    return next(err);
  }
}
