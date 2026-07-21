import { insertOne, filter, removeOne } from "./jsonStore.js";
import { randomUUID } from "node:crypto";
import { generateToken, hashToken } from "../utils/tokens.js";

function maskCardNumber(value = "") {
  const digits = String(value).replace(/\D/g, "");
  return digits.slice(-4).padStart(4, "*");
}

export function createCardToken({ userId, cardNumber, brand, holderName, expMonth, expYear }) {
  const now = new Date().toISOString();
  const tokenValue = generateToken("card");
  const record = {
    id: randomUUID(),
    user_id: userId,
    token: tokenValue,
    card_hash: hashToken(cardNumber),
    last4: maskCardNumber(cardNumber),
    brand: (brand || "generic").toUpperCase(),
    holder_name: holderName,
    exp_month: expMonth,
    exp_year: expYear,
    created_at: now
  };
  insertOne("cardTokens", record);
  return {
    id: record.id,
    token: record.token,
    last4: record.last4,
    brand: record.brand,
    holderName: record.holder_name,
    expMonth: record.exp_month,
    expYear: record.exp_year,
    createdAt: record.created_at
  };
}

export function listCardTokensByUser(userId) {
  return filter("cardTokens", (item) => item.user_id === userId).map((record) => ({
    id: record.id,
    last4: record.last4,
    brand: record.brand,
    holderName: record.holder_name,
    expMonth: record.exp_month,
    expYear: record.exp_year,
    createdAt: record.created_at
  }));
}

export function deleteCardToken({ userId, tokenId }) {
  return removeOne("cardTokens", (record) => record.id === tokenId && record.user_id === userId);
}
