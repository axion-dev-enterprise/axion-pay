import { insertOne, listAll, filter, updateOne, removeOne, findOne } from "./jsonStore.js";
import { randomUUID } from "node:crypto";

function now() {
  return new Date().toISOString();
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    payTagId: record.pay_tag_id || null,
    slug: record.slug,
    title: record.title,
    description: record.description,
    price: record.price,
    currency: record.currency,
    theme: record.theme,
    template: record.template || "classic",
    appearance: record.appearance || null,
    paymentConfig: record.payment_config || null,
    features: record.features || [],
    socialProof: record.social_proof || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function normalizeSlug(slug) {
  if (!slug) return "";
  return String(slug).trim().toLowerCase().replace(/[^\w-]/g, "-").replace(/--+/g, "-");
}

export function listCheckoutProductsByUser(userId) {
  const records = filter("checkoutProducts", (entry) => entry.user_id === userId);
  return records
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .map(mapRecord);
}

export function findCheckoutProductById(id) {
  const record = findOne("checkoutProducts", (entry) => entry.id === id);
  return mapRecord(record);
}

export function findCheckoutProductBySlug(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const record = findOne("checkoutProducts", (entry) => entry.slug === normalized);
  return mapRecord(record);
}

export function findCheckoutProductByUserAndSlug(userId, slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const record = findOne(
    "checkoutProducts",
    (entry) => entry.user_id === userId && entry.slug === normalized
  );
  return mapRecord(record);
}

export function createCheckoutProduct({
  userId,
  payTagId = null,
  slug,
  title,
  description,
  price,
  currency,
  theme,
  template = "classic",
  appearance = null,
  paymentConfig = null,
  features = [],
  socialProof = []
}) {
  const normalizedSlug = normalizeSlug(slug) || `${randomUUID().slice(0, 8)}`;
  const record = {
    id: randomUUID(),
    user_id: userId,
    pay_tag_id: payTagId,
    slug: normalizedSlug,
    title,
    description,
    price,
    currency,
    theme,
    template,
    appearance,
    payment_config: paymentConfig,
    features,
    social_proof: socialProof,
    created_at: now(),
    updated_at: now()
  };
  insertOne("checkoutProducts", record);
  return mapRecord(record);
}

export function updateCheckoutProduct(id, patch) {
  const normalizedPatch = { ...patch };
  if (normalizedPatch.slug !== undefined) {
    normalizedPatch.slug = normalizeSlug(normalizedPatch.slug);
  }
  const updated = updateOne(
    "checkoutProducts",
    (entry) => entry.id === id,
    {
      ...normalizedPatch,
      updated_at: now()
    }
  );
  return mapRecord(updated);
}

export function deleteCheckoutProduct(id) {
  return removeOne("checkoutProducts", (entry) => entry.id === id);
}

export function listAllCheckoutProducts() {
  return listAll("checkoutProducts").map(mapRecord);
}
