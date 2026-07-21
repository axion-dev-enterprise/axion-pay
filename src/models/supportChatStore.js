import { insertOne, listAll, updateOne, filter } from "./jsonStore.js";
import { randomUUID } from "node:crypto";

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    userName: record.user_name || null,
    userEmail: record.user_email || null,
    message: record.message,
    adminResponse: record.admin_response || null,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function createSupportChat({ userId, userName, userEmail, message }) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    message,
    admin_response: null,
    status: "pending",
    created_at: now,
    updated_at: now
  };
  insertOne("supportChats", record);
  return mapRecord(record);
}

export function listSupportChatsByUser(userId) {
  const records = filter("supportChats", (entry) => entry.user_id === userId);
  const sorted = records.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return sorted.map(mapRecord);
}

export function listAllSupportChats() {
  const records = listAll("supportChats");
  const sorted = records.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return sorted.map(mapRecord);
}

export function respondToSupportChat(id, response) {
  const now = new Date().toISOString();
  const updated = updateOne(
    "supportChats",
    (entry) => entry.id === id,
    {
      admin_response: response,
      status: "responded",
      updated_at: now
    }
  );
  return mapRecord(updated);
}
