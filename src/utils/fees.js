function toCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function fromCents(value) {
  const cents = Number(value);
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

function clampInt(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  const rounded = Math.round(num);
  return Math.max(min, Math.min(max, rounded));
}

function getFeeConfig(config, method) {
  const fallback = method === "card"
    ? { fixedCents: 100, percentBps: 500 }
    : { fixedCents: 100, percentBps: 50 };

  const fromConfig = config?.payout?.fees?.[method];
  if (!fromConfig) return fallback;

  return {
    fixedCents: clampInt(fromConfig.fixedCents, 0, 1_000_000_00),
    percentBps: clampInt(fromConfig.percentBps, 0, 10_000)
  };
}

export function computePayoutAmounts({ amount, method, config }) {
  const normalized = String(method || "pix").toLowerCase();
  const safeMethod = normalized === "card" ? "card" : "pix";
  const feeConfig = getFeeConfig(config, safeMethod);

  const amountCents = toCents(amount);
  const variableFee = Math.round((amountCents * feeConfig.percentBps) / 10_000);
  const feeCents = Math.min(amountCents, feeConfig.fixedCents + variableFee);
  const netCents = Math.max(amountCents - feeCents, 0);

  return {
    method: safeMethod,
    amount_cents: amountCents,
    fee_cents: feeCents,
    net_cents: netCents,
    amount: fromCents(amountCents),
    fee_total: fromCents(feeCents),
    net_amount: fromCents(netCents),
    fee_breakdown: {
      fixed_cents: feeConfig.fixedCents,
      variable_cents: variableFee,
      percent_bps: feeConfig.percentBps
    }
  };
}

