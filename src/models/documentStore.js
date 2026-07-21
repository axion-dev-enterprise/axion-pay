import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { insertOne, filter, findOne, listAll } from "./jsonStore.js";
import { config } from "../config/env.js";
import { getUserById } from "./userStore.js";

const uploadsDir = path.resolve(config.uploadsPath);
fs.mkdirSync(uploadsDir, { recursive: true });

function now() {
  return new Date().toISOString();
}

function mapDocument(record, user = null) {
  if (!record) return null;
  const base = {
    id: record.id,
    userId: record.user_id,
    originalName: record.original_name,
    storedName: record.stored_name,
    mimetype: record.mimetype,
    size: record.size,
    notes: record.notes,
    uploadedAt: record.uploaded_at
  };
  if (user) {
    base.owner = { name: user.name || null, email: user.email || null };
  }
  return base;
}

export function createDocumentEntry({ userId, originalName, storedName, mimetype, size, notes }) {
  const id = uuid();
  const timestamp = now();
  const record = {
    id,
    user_id: userId,
    original_name: originalName,
    stored_name: storedName,
    mimetype,
    size,
    notes: notes || null,
    uploaded_at: timestamp
  };
  insertOne("documents", record);
  const user = getUserById(userId);
  return mapDocument(record, user);
}

export function listDocumentsByUser(userId) {
  const rows = filter("documents", (doc) => doc.user_id === userId);
  rows.sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""));
  const user = getUserById(userId);
  return rows.map((row) => mapDocument(row, user));
}

export function listAllDocuments() {
  const rows = listAll("documents");
  rows.sort((a, b) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""));
  return rows.map((row) => mapDocument(row, getUserById(row.user_id)));
}

export function getDocumentById(id) {
  const row = findOne("documents", (doc) => doc.id === id);
  return mapDocument(row, getUserById(row?.user_id));
}

export function resolveDocumentPath(storedName) {
  return path.join(uploadsDir, storedName);
}
