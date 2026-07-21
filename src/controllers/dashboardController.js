import { listPayTagsByUser } from "../models/payTagsStore.js";
import { listDocumentsByUser } from "../models/documentStore.js";
import { listApiKeys } from "../models/userStore.js";
import { listPayoutRequestsByUser } from "../models/payoutStore.js";
import { listAllTransactions } from "../models/transactionStore.js";

function formatNumber(value) {
  return value ?? 0;
}

function toRecentTransactions(transactions, limit = 6) {
  const sorted = [...transactions].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return sorted.slice(0, limit);
}

function normalizePayTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeOptionalId(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function filterTransactionsForUser(payTags, transactions, userId) {
  const ownedPayTags = new Set(payTags.map((tag) => normalizePayTag(tag.name)));
  const normalizedUserId = normalizeOptionalId(userId);

  return transactions.filter((tx) => {
    const txPayTag = normalizePayTag(tx?.metadata?.pay_tag);
    if (txPayTag && ownedPayTags.has(txPayTag)) return true;

    const metadataUserId = normalizeOptionalId(tx?.metadata?.userId || tx?.metadata?.user_id);
    if (metadataUserId && metadataUserId === normalizedUserId) return true;

    const customerId = normalizeOptionalId(tx?.customerId || tx?.customer_id);
    if (customerId && customerId === normalizedUserId) return true;

    return false;
  });
}

function buildPayTagInsights(payTags, transactions) {
  const grouped = new Map();
  const ordered = [...transactions].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  ordered.forEach((tx) => {
    const normalized = normalizePayTag(tx.metadata?.pay_tag);
    if (!normalized) return;
    const snapshot = grouped.get(normalized) || {
      count: 0,
      volume: 0,
      breakdown: {},
      lastTransaction: null
    };
    snapshot.count += 1;
    snapshot.volume += tx.amount ?? 0;
    const status = tx.status || "unknown";
    const statusEntry = snapshot.breakdown[status] || { count: 0, volume: 0 };
    statusEntry.count += 1;
    statusEntry.volume += tx.amount ?? 0;
    snapshot.breakdown[status] = statusEntry;
    if (!snapshot.lastTransaction) {
      snapshot.lastTransaction = tx;
    }
    grouped.set(normalized, snapshot);
  });

  return payTags.map((tag) => {
    const normalizedName = normalizePayTag(tag.name);
    const stats = grouped.get(normalizedName) || {
      count: 0,
      volume: 0,
      breakdown: {},
      lastTransaction: null
    };
    return {
      id: tag.id,
      name: tag.name,
      stats: {
        transactionCount: stats.count,
        totalVolume: stats.volume,
        statusBreakdown: Object.keys(stats.breakdown).map((status) => ({
          status,
          count: stats.breakdown[status].count,
          volume: formatNumber(stats.breakdown[status].volume)
        })),
        lastTransaction: stats.lastTransaction
      }
    };
  });
}

export function overviewHandler(req, res) {
  const userId = req.user.id;
  const payTags = listPayTagsByUser(userId);
  const tokens = listApiKeys(userId);
  const documents = listDocumentsByUser(userId);
  const allTransactions = listAllTransactions();
  const transactions = filterTransactionsForUser(payTags, allTransactions, userId);
  const payoutRequests = listPayoutRequestsByUser(userId);

  const statusMap = {};
  let totalVolume = 0;
  transactions.forEach((tx) => {
    const status = tx.status || "unknown";
    statusMap[status] = statusMap[status] || { count: 0, volume: 0 };
    statusMap[status].count += 1;
    statusMap[status].volume += tx.amount ?? 0;
    totalVolume += tx.amount ?? 0;
  });

  const statusBreakdown = Object.keys(statusMap).map((status) => ({
    status,
    count: statusMap[status].count,
    volume: formatNumber(statusMap[status].volume)
  }));
  const reserved = payoutRequests.reduce((sum, request) => sum + (request.amount || 0), 0);
  const availableBalance = Math.max(totalVolume - reserved, 0);
  const payTagInsights = buildPayTagInsights(payTags, transactions);

  return res.json({
    ok: true,
    overview: {
      payTags: payTags.length,
      tokens: tokens.length,
      documents: documents.length,
      availableBalance,
      totalVolume: formatNumber(totalVolume),
      transactionCount: transactions.length,
      statusBreakdown,
      payTagInsights
    },
    recentTransactions: toRecentTransactions(transactions, 6)
  });
}

export function listClientInsightsHandler(_req, res) {
  const transactions = listAllTransactions();
  const grouped = {};
  transactions.forEach((tx) => {
    const customerId = tx.customerId || tx.customer?.id || tx.customer?.email || "untracked";
    const customerName = tx.customer?.name || (typeof tx.customer === "string" ? tx.customer : "Desconhecido");
    const key = customerId || customerName || "untracked";
    const entry = grouped[key] || {
      customerId: key,
      customerName,
      transactions: 0,
      volume: 0
    };
    entry.transactions += 1;
    entry.volume += tx.amount ?? 0;
    grouped[key] = entry;
  });

  const clients = Object.values(grouped)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 20);

  return res.json({ ok: true, clients });
}

export function listPayTagInsights(req, res) {
  const userId = req.user.id;
  const payTags = listPayTagsByUser(userId);
  const allTransactions = listAllTransactions();
  const transactions = filterTransactionsForUser(payTags, allTransactions, userId);
  const payTagInsights = buildPayTagInsights(payTags, transactions);
  return res.json({ ok: true, payTags: payTags, payTagInsights });
}
