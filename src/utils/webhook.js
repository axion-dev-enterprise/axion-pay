import crypto from "crypto";

function parseSignature(signatureHeader) {
  if (!signatureHeader) return { algorithm: "sha256", signature: "" };
  const header = String(signatureHeader).trim();
  const parts = header.split("=");
  if (parts.length === 2 && /^sha(1|256)$/i.test(parts[0])) {
    return { algorithm: parts[0].toLowerCase(), signature: parts[1] };
  }
  return { algorithm: "sha256", signature: header };
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function parseTimestamp(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return null;
    return numeric > 1e12 ? numeric : numeric * 1000;
  }
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function isTimestampFresh(timestampMs, toleranceSeconds) {
  if (!timestampMs || !toleranceSeconds) return true;
  const diff = Math.abs(Date.now() - timestampMs);
  return diff <= toleranceSeconds * 1000;
}

export function verifyWebhookSignature({
  rawBody,
  signatureHeader,
  secret,
  timestampHeader,
  toleranceSeconds,
  requireTimestamp
}) {
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!rawBody) {
    return { ok: false, error: "Missing raw body for signature verification." };
  }
  if (!signatureHeader) {
    return { ok: false, error: "Missing signature header." };
  }

  if (requireTimestamp || timestampHeader) {
    const timestampMs = parseTimestamp(timestampHeader);
    if (!timestampMs) {
      return { ok: false, error: "Missing or invalid timestamp header." };
    }
    if (!isTimestampFresh(timestampMs, toleranceSeconds)) {
      return { ok: false, error: "Webhook timestamp outside tolerance window." };
    }
  }

  const { algorithm, signature } = parseSignature(signatureHeader);
  const digest = crypto.createHmac(algorithm, secret).update(rawBody).digest("hex");
  const match = safeEqual(digest, signature);
  if (!match) {
    return { ok: false, error: "Invalid signature." };
  }
  return { ok: true };
}
