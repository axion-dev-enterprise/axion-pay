export function buildCardSummary(card) {
  if (!card) return null;
  return {
    last4: card.number ? card.number.slice(-4) : '****',
    holder: card.holder_name
  };
}

export function normalizeMetadata(metadata) {
  return metadata || {};
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeCurrency(value) {
  if (!value) return "BRL";
  return String(value).trim().toUpperCase();
}

export function normalizeCustomer(customer) {
  if (!customer) return null;
  if (!isPlainObject(customer)) return null;
  const normalized = { ...customer };
  if (normalized.id) {
    normalized.id = String(normalized.id).trim();
  }
  if (normalized.email) {
    normalized.email = String(normalized.email).trim().toLowerCase();
  }
  return normalized;
}

export function normalizeCapture(value) {
  if (value === undefined || value === null || value === "") {
    return { value: true };
  }
  if (typeof value === "boolean") {
    return { value };
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return { value: true };
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return { value: false };
  }
  return { error: 'Campo "capture" deve ser booleano.' };
}

export function parseAmountInput({ amount, amount_cents }) {
  if (amount_cents !== undefined && amount_cents !== null && amount_cents !== "") {
    const cents = Number(amount_cents);
    if (!Number.isFinite(cents) || cents <= 0 || !Number.isInteger(cents)) {
      return { error: 'Campo "amount_cents" deve ser inteiro positivo.' };
    }
    return { amount: cents / 100, amount_cents: cents };
  }

  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { error: 'Campo "amount" deve ser numero positivo.' };
  }
  return { amount: parsed, amount_cents: Math.round(parsed * 100) };
}

export function parseOptionalAmountInput({ amount, amount_cents }) {
  const hasAmount =
    amount !== undefined && amount !== null && String(amount).trim() !== "";
  const hasCents =
    amount_cents !== undefined &&
    amount_cents !== null &&
    String(amount_cents).trim() !== "";

  if (!hasAmount && !hasCents) {
    return { amount_cents: null };
  }

  return parseAmountInput({ amount, amount_cents });
}

export function validateCardInput(card, card_hash) {
  if (card_hash) {
    return null;
  }
  if (!card || !isPlainObject(card)) {
    return 'Campo "card" obrigatorio quando "card_hash" nao informado.';
  }
  if (!card.number || !card.exp_month || !card.exp_year || !card.cvv) {
    return 'Campos obrigatorios do cartao: "number", "exp_month", "exp_year", "cvv".';
  }
  return null;
}

export function normalizeWhatsapp(value) {
  if (!value) return "";
  const digits = String(value)
    .trim()
    .replace(/[^\d\+]/g, "");
  return digits;
}

export function normalizePayTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

export function isInfinitePayTag(value) {
  const normalized = normalizePayTag(value);
  return (
    normalized === "anne-tom" ||
    normalized === "annetom" ||
    normalized === "axion-pdv" ||
    normalized === "axionpdv"
  );
}
