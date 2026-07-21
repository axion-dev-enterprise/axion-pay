import { v4 as uuid } from "uuid";
import {
  insertOne,
  findOne,
  filter,
  updateOne
} from "./jsonStore.js";
import { generateToken, hashToken } from "../utils/tokens.js";

function now() {
  return new Date().toISOString();
}

function toCamel(record) {
  const mapped = {};
  if (!record) return null;
  for (const key of Object.keys(record)) {
    mapped[key] = record[key];
    const camelKey = key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
    mapped[camelKey] = record[key];
  }
  return mapped;
}

function mapUser(record) {
  if (!record) return null;
  const clean = toCamel(record);
  clean.emailVerified = Boolean(record.email_verified);
  clean.docsSentAt = record.docs_sent_at || null;
  clean.approvedAt = record.approved_at || null;
  clean.rejectedAt = record.rejected_at || null;
  clean.reviewNotes = record.review_notes || null;
  clean.role = record.role || "user";
  clean.defaultPayoutDestination = record.default_payout_destination || null;
  delete clean.password_hash;
  return clean;
}

export function createUser({
  name,
  email,
  whatsapp,
  passwordHash,
  cpf,
  company,
  cnpj,
  volume,
  emailVerified = false,
  role = "user"
}) {
  const record = {
    id: uuid(),
    name,
    email,
    whatsapp,
    password_hash: passwordHash,
    cpf,
    company,
    cnpj,
    volume,
    role,
    default_payout_destination: null,
    status: "pending",
    email_verified: emailVerified ? 1 : 0,
    docs_sent_at: null,
    approved_at: null,
    rejected_at: null,
    review_notes: null,
    created_at: now(),
    updated_at: now()
  };
  insertOne("users", record);
  return mapUser(record);
}

export function getUserByEmail(email) {
  const record = findOne("users", (user) => user.email?.toLowerCase() === email?.toLowerCase());
  return mapUser(record);
}

export function getUserByWhatsapp(whatsapp) {
  const record = findOne("users", (user) => user.whatsapp === whatsapp);
  return mapUser(record);
}

export function getUserById(id) {
  const record = findOne("users", (user) => user.id === id);
  return mapUser(record);
}

export function getUserByIdWithPassword(id) {
  return findOne("users", (user) => user.id === id);
}

export function getUserByEmailWithPassword(email) {
  return findOne("users", (user) => user.email?.toLowerCase() === email?.toLowerCase());
}

export function getUserByWhatsappWithPassword(whatsapp) {
  return findOne("users", (user) => user.whatsapp === whatsapp);
}

export function setEmailVerified(userId) {
  const result = updateOne("users", (user) => user.id === userId, {
    email_verified: 1,
    updated_at: now()
  });
  return mapUser(result);
}

export function updateUserStatus(userId, status, reviewNotes = null) {
  const timestamp = now();
  const patch = {
    status,
    updated_at: timestamp,
    review_notes: reviewNotes
  };
  if (status === "approved") {
    patch.approved_at = timestamp;
    patch.rejected_at = null;
  }
  if (status === "rejected") {
    patch.rejected_at = timestamp;
    patch.approved_at = null;
  }
  const updated = updateOne("users", (user) => user.id === userId, patch);
  return mapUser(updated);
}

export function setUserDefaultPayoutDestination(userId, destination) {
  const updated = updateOne(
    "users",
    (user) => user.id === userId,
    {
      default_payout_destination: destination || null,
      updated_at: now()
    }
  );
  return mapUser(updated);
}

export function getUserDefaultPayoutDestination(userId) {
  const record = findOne("users", (user) => user.id === userId);
  return record?.default_payout_destination || null;
}

export function markDocsSent(userId) {
  const result = updateOne("users", (user) => user.id === userId, {
    docs_sent_at: now(),
    updated_at: now()
  });
  return mapUser(result);
}

export function listUsers({ status, limit = 50, offset = 0 }) {
  let rows = filter("users", (user) => (status ? user.status === status : true));
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  const total = rows.length;
  const sliced = rows.slice(offset, offset + limit);
  return {
    total,
    users: sliced.map(mapUser)
  };
}

export function createApiKey({ userId, label }) {
  const key = generateToken("axion_key");
  const keyHash = hashToken(key);
  const record = {
    id: uuid(),
    user_id: userId,
    key_hash: keyHash,
    key_prefix: key.slice(0, 8),
    last4: key.slice(-4),
    label: label || null,
    created_at: now(),
    revoked_at: null
  };
  insertOne("apiKeys", record);
  return { ...record, key };
}

export function listApiKeys(userId) {
  const rows = filter("apiKeys", (key) => key.user_id === userId);
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return rows.map((key) => ({
    ...key
  }));
}

export function revokeApiKey({ userId, apiKeyId }) {
  return updateOne("apiKeys", (key) => key.id === apiKeyId && key.user_id === userId, {
    revoked_at: now()
  });
}

export function findUserByApiKey(token) {
  const hashed = hashToken(token);
  const entry = findOne("apiKeys", (key) => key.key_hash === hashed && !key.revoked_at);
  if (!entry) return null;
  return getUserById(entry.user_id);
}

export function createEmailToken({ userId, type, expiresAt }) {
  const token = generateToken("email");
  const record = {
    id: uuid(),
    user_id: userId,
    token_hash: hashToken(token),
    type,
    expires_at: expiresAt,
    used_at: null,
    created_at: now()
  };
  insertOne("emailTokens", record);
  return token;
}

export function consumeEmailToken({ token, type }) {
  const tokenHash = hashToken(token);
  const entry = findOne(
    "emailTokens",
    (item) => item.token_hash === tokenHash && item.type === type && !item.used_at
  );
  if (!entry) return null;
  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }
  updateOne("emailTokens", (item) => item.id === entry.id, { used_at: now() });
  return entry;
}

export function createSession({ userId, expiresAt }) {
  const token = generateToken("session");
  const record = {
    id: uuid(),
    user_id: userId,
    token_hash: hashToken(token),
    created_at: now(),
    expires_at: expiresAt,
    revoked_at: null
  };
  insertOne("sessions", record);
  return token;
}

export function getSessionByToken(token) {
  const tokenHash = hashToken(token);
  const session = findOne(
    "sessions",
    (item) => item.token_hash === tokenHash && !item.revoked_at
  );
  if (!session) return null;
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return null;
  }
  return getUserById(session.user_id);
}

export function revokeSession(token) {
  updateOne("sessions", (item) => item.token_hash === hashToken(token), {
    revoked_at: now()
  });
}

export function createAdminSession({ expiresAt }) {
  const token = generateToken("admin");
  const record = {
    id: uuid(),
    token_hash: hashToken(token),
    created_at: now(),
    expires_at: expiresAt,
    revoked_at: null
  };
  insertOne("adminSessions", record);
  return token;
}

export function getAdminSession(token) {
  const hash = hashToken(token);
  const session = findOne(
    "adminSessions",
    (item) => item.token_hash === hash && !item.revoked_at
  );
  if (!session) return null;
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return null;
  }
  return session;
}

export function revokeAdminSession(token) {
  updateOne("adminSessions", (item) => item.token_hash === hashToken(token), {
    revoked_at: now()
  });
}
