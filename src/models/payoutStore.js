import { insertOne, listAll, updateOne, filter } from "./jsonStore.js";
import { randomUUID } from "node:crypto";

function mapRequest(record) {
  if (!record) return null;
  const status = record.status === "released" ? "approved" : record.status;
  return {
    id: record.id,
    userId: record.user_id,
    amount: record.amount,
    feeTotal: record.fee_total ?? null,
    netAmount: record.net_amount ?? null,
    feeBreakdown: record.fee_breakdown ?? null,
    method: record.method,
    destination: record.destination || null,
    notes: record.notes,
    status,
    requestedAt: record.requested_at,
    updatedAt: record.updated_at,
    releasedAt: record.released_at || null,
    approvedAt: record.approved_at || null,
    paidAt: record.paid_at || null,
    rejectedAt: record.rejected_at || null,
    adminNotes: record.admin_notes || null
  };
}

export function createPayoutRequest({ userId, amount, feeTotal, netAmount, feeBreakdown, method, notes, destination }) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    user_id: userId,
    amount,
    fee_total: feeTotal ?? null,
    net_amount: netAmount ?? null,
    fee_breakdown: feeBreakdown ?? null,
    method,
    notes: notes || null,
    destination: destination || null,
    status: "pending",
    requested_at: now,
    updated_at: now,
    released_at: null,
    approved_at: null,
    paid_at: null,
    rejected_at: null,
    admin_notes: null
  };
  insertOne("payoutRequests", record);
  return mapRequest(record);
}

export function listPayoutRequestsByUser(userId) {
  const records = filter("payoutRequests", (item) => item.user_id === userId);
  const sorted = records.sort((a, b) => (b.requested_at || "").localeCompare(a.requested_at || ""));
  return sorted.map(mapRequest);
}

export function listAllPayoutRequests() {
  const records = listAll("payoutRequests");
  records.sort((a, b) => (b.requested_at || "").localeCompare(a.requested_at || ""));
  return records.map(mapRequest);
}

export function updatePayoutRequestStatus(id, patch) {
  const updates = updateOne(
    "payoutRequests",
    (item) => item.id === id,
    {
      ...patch,
      updated_at: new Date().toISOString()
    }
  );
  return mapRequest(updates);
}
