import crypto from "crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
}
