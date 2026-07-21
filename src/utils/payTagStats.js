function normalizePayTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function buildPayTagInsights(payTags, transactions) {
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
          volume: stats.breakdown[status].volume
        })),
        lastTransaction: stats.lastTransaction
      }
    };
  });
}
