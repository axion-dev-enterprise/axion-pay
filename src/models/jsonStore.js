import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

const defaultStore = {
  transactions: [],
  transactionEvents: [],
  idempotencyKeys: [],
  users: [],
  apiKeys: [],
  emailTokens: [],
  sessions: [],
  adminSessions: [],
  payTags: [],
  payTagPermissions: [],
  documents: [],
  permissions: [],
  payoutRequests: [],
  supportChats: [],
  checkoutProducts: [],
  cardTokens: []
};

const permissionSeed = [
  "pix:create",
  "infinitepay:create",
  "admin:view_transactions",
  "admin:view_users",
  "admin:manage_tags"
];

const storagePath = config.storage.dataFile;
const memoryMode = config.dbPath === ":memory:";

function clone(value) {
  if (value === null || value === undefined) return value;
  return structuredClone(value);
}

function ensureStore(data = {}) {
  const base = { ...defaultStore };
  for (const key of Object.keys(base)) {
    if (!Array.isArray(data[key])) {
      data[key] = [];
    }
  }
  return Object.assign(base, data);
}

function loadStore() {
  if (memoryMode) {
    return ensureStore();
  }
  try {
    const content = fs.readFileSync(storagePath, "utf8");
    const parsed = JSON.parse(content);
    return ensureStore(parsed);
  } catch (err) {
    return ensureStore();
  }
}

function persistStore(store) {
  if (memoryMode) return;
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    logger.error({ error: err }, "Falha ao persistir store JSON");
  }
}

let store = loadStore();

function seedPermissions() {
  try {
    const permissions = store.permissions || [];
    let changed = false;
    permissionSeed.forEach((name) => {
      if (!permissions.find((perm) => perm.name === name)) {
        permissions.push({ id: randomUUID(), name, created_at: new Date().toISOString() });
        changed = true;
      }
    });
    if (changed) {
      store.permissions = permissions;
      persistStore(store);
    }
  } catch (err) {
    logger.error({ error: err }, "Falha ao semear permissões");
  }
}

try {
  seedPermissions();
} catch (err) {
  logger.error({ error: err }, "Erro na execução inicial de seedPermissions");
}

logger.info({ storagePath, memoryMode }, "JSON store inicializado.");

process.on("exit", () => persistStore(store));
process.on("SIGINT", () => persistStore(store));
process.on("SIGTERM", () => persistStore(store));

function getCollection(name) {
  if (!Object.prototype.hasOwnProperty.call(store, name)) {
    store[name] = [];
  }
  return store[name];
}

export function listAll(name) {
  return getCollection(name).map(clone);
}

export function findOne(name, predicate) {
  const item = getCollection(name).find(predicate);
  return clone(item) || null;
}

export function filter(name, predicate) {
  return getCollection(name).filter(predicate).map(clone);
}

export function insertOne(name, record) {
  const collection = getCollection(name);
  collection.push(record);
  persistStore(store);
  return clone(record);
}

export function updateOne(name, predicate, patch) {
  const collection = getCollection(name);
  const index = collection.findIndex(predicate);
  if (index === -1) return null;
  collection[index] = { ...collection[index], ...patch };
  persistStore(store);
  return clone(collection[index]);
}

export function removeOne(name, predicate) {
  const collection = getCollection(name);
  const index = collection.findIndex(predicate);
  if (index === -1) return false;
  collection.splice(index, 1);
  persistStore(store);
  return true;
}

export function count(name, predicate) {
  const collection = getCollection(name);
  if (typeof predicate === "function") {
    return collection.filter(predicate).length;
  }
  return collection.length;
}

export function ensureOne(name, predicate, builder) {
  let item = getCollection(name).find(predicate);
  if (item) {
    return clone(item);
  }
  item = builder();
  insertOne(name, item);
  return clone(item);
}

export function persist() {
  persistStore(store);
}
