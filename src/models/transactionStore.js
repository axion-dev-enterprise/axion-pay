import { v4 as uuid } from "uuid";
import { insertOne, findOne, filter, updateOne, listAll } from "./jsonStore.js";

function toCamelCase(record) {
  const mapped = {};
  for (const key of Object.keys(record || {})) {
    mapped[key] = record[key];
    const camelKey = key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
    mapped[camelKey] = record[key];
  }
  return mapped;
}

function buildTransactionRecord(data) {
  const now = new Date().toISOString();
  return {
    id: data.id,
    amount: data.amount ?? 0,
    amount_cents: data.amount_cents ?? 0,
    currency: data.currency || "BRL",
    method: data.method,
    status: data.status || "pending",
    capture: data.capture !== undefined ? Boolean(data.capture) : true,
    customer: data.customer || null,
    customer_id: data.customer?.id || null,
    provider: data.provider || null,
    provider_reference: data.providerReference || data.provider_reference || null,
    method_details: data.methodDetails || data.method_details || null,
    metadata: data.metadata || null,
    created_at: now,
    updated_at: now
  };
}

export function createTransaction(data) {
  const record = buildTransactionRecord(data);
  insertOne("transactions", record);
  return mapRecord(record);
}

function toSnakeCase(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function updateTransaction(id, updates) {
  const patch = { ...updates };
  delete patch.id;
  patch.updated_at = new Date().toISOString();
  const normalizedPatch = {};
  for (const key of Object.keys(patch)) {
    normalizedPatch[toSnakeCase(key)] = patch[key];
  }
  const updated = updateOne("transactions", (tx) => tx.id === id, normalizedPatch);
  return updated ? mapRecord(updated) : null;
}

export function getTransaction(id) {
  const record = findOne("transactions", (tx) => tx.id === id);
  return mapRecord(record);
}

export function findTransactionByProviderReference(ref) {
  const record = findOne("transactions", (tx) => tx.provider_reference === ref);
  return mapRecord(record);
}

export function listTransactions(criteria = {}) {
  let rows = filter("transactions", (tx) => {
    if (criteria.status && tx.status !== criteria.status) return false;
    if (criteria.method && tx.method !== criteria.method) return false;
    if (criteria.provider && tx.provider !== criteria.provider) return false;
    if (criteria.customerId && tx.customer_id !== criteria.customerId) return false;
    if (criteria.from && tx.created_at < criteria.from) return false;
    if (criteria.to && tx.created_at > criteria.to) return false;
    return true;
  });
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return rows.map(mapRecord);
}

export function setIdempotencyKey(key, transactionId) {
  const exists = findOne("idempotencyKeys", (entry) => entry.key === key);
  if (exists) return;
  insertOne("idempotencyKeys", {
    id: uuid(),
    key,
    transaction_id: transactionId,
    created_at: new Date().toISOString()
  });
}

export function getTransactionByIdempotencyKey(key) {
  const entry = findOne("idempotencyKeys", (item) => item.key === key);
  if (!entry) return null;
  return getTransaction(entry.transaction_id);
}

export function getTransactionEvents(id) {
  const events = filter("transactionEvents", (event) => event.transaction_id === id);
  events.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return events.map((event) => ({
    id: event.id,
    transactionId: event.transaction_id,
    type: event.type,
    payload: event.payload ?? null,
    created_at: event.created_at
  }));
}

export function appendEvent(id, event) {
  const payload = event?.payload ?? event;
  insertOne("transactionEvents", {
    id: uuid(),
    transaction_id: id,
    type: event?.type || "event",
    payload: payload ?? null,
    created_at: new Date().toISOString()
  });
  return getTransaction(id);
}

export function mergeTransactionMetadata(id, patch) {
  const existing = getTransaction(id);
  if (!existing) return null;
  const updatedMetadata = { ...(existing.metadata || {}), ...patch };
  return updateTransaction(id, { metadata: updatedMetadata });
}

export function listAllTransactions() {
  const rows = listAll("transactions");
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return rows.map(mapRecord);
}

function mapRecord(record) {
  if (!record) return null;
  return toCamelCase(record);
}
