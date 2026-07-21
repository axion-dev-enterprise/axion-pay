import { v4 as uuid } from "uuid";
import { insertOne, filter, updateOne, removeOne, findOne, listAll } from "./jsonStore.js";
import { findPermissionByName, findPermissionById } from "./permissionStore.js";

function now() {
  return new Date().toISOString();
}

function mapPayTag(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    description: record.description,
    webhookUrl: record.webhook_url,
    enabled: Boolean(record.enabled),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function createPayTag({ userId, name, description, webhookUrl }) {
  const id = uuid();
  const timestamp = now();
  const record = {
    id,
    user_id: userId,
    name,
    description: description || null,
    webhook_url: webhookUrl || null,
    enabled: 1,
    created_at: timestamp,
    updated_at: timestamp
  };
  insertOne("payTags", record);
  return mapPayTag(record);
}

export function listPayTagsByUser(userId) {
  const rows = filter("payTags", (tag) => tag.user_id === userId);
  rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return rows.map(mapPayTag);
}

export function togglePayTagStatus({ userId, payTagId }) {
  const tag = findOne("payTags", (entry) => entry.id === payTagId && entry.user_id === userId);
  if (!tag) return null;
  const updated = updateOne("payTags", (entry) => entry.id === payTagId && entry.user_id === userId, {
    enabled: tag.enabled ? 0 : 1,
    updated_at: now()
  });
  return mapPayTag(updated);
}

export function deletePayTag({ userId, payTagId }) {
  return removeOne("payTags", (entry) => entry.id === payTagId && entry.user_id === userId);
}

export function findPayTagById(payTagId) {
  const tag = findOne("payTags", (entry) => entry.id === payTagId);
  return mapPayTag(tag);
}

export function listAllPayTags() {
  const rows = listAll("payTags");
  return rows.map(mapPayTag);
}

export function findPayTagByName(name) {
  const tag = findOne("payTags", (entry) => entry.name === name);
  return mapPayTag(tag);
}

export function findPayTagByNormalizedName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return null;
  const tag = findOne(
    "payTags",
    (entry) => String(entry.name || "").trim().toLowerCase() === normalized
  );
  return mapPayTag(tag);
}

export function listPermissionsForTag(tagId) {
  const rels = filter("payTagPermissions", (entry) => entry.tag_id === tagId);
  return rels
    .map((rel) => {
      const permission = findPermissionById(rel.permission_id);
      return permission?.name || null;
    })
    .filter(Boolean);
}

export function assignPermissionsToTag(tagId, permissionNames = []) {
  const applied = [];
  permissionNames.forEach((name) => {
    const permission = findPermissionByName(name);
    if (!permission) return;
    const exists = findOne(
      "payTagPermissions",
      (entry) => entry.tag_id === tagId && entry.permission_id === permission.id
    );
    if (!exists) {
      insertOne("payTagPermissions", {
        id: uuid(),
        tag_id: tagId,
        permission_id: permission.id
      });
    }
    applied.push({ name: permission.name });
  });
  return applied;
}
