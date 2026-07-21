import crypto from "crypto";

export function generateToken(prefix = "axion") {
  const value = crypto.randomBytes(24).toString("hex");
  return `${prefix}_${value}`;
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}
