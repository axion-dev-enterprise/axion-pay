export function redactSensitiveFields(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactSensitiveFields(item));
  if (typeof obj !== "object") return obj;

  const redacted = { ...obj };
  if (redacted.card_hash) redacted.card_hash = "***";
  if (redacted.cvv) redacted.cvv = "***";
  if (redacted.card && typeof redacted.card === "object" && redacted.card.cvv) {
    redacted.card = { ...redacted.card, cvv: "***" };
  }
  return redacted;
}
