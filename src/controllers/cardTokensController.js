import { AppError } from "../utils/errors.js";
import { createCardToken, listCardTokensByUser, deleteCardToken } from "../models/cardTokenStore.js";

export async function createCardTokenHandler(req, res, next) {
  try {
    const user = req.user;
    const { cardNumber, holderName, expMonth, expYear, brand } = req.body;
    const sanitized = String(cardNumber || "").replace(/\D/g, "");
    if (!sanitized) {
      throw new AppError("Número do cartão inválido.", 400, "invalid_card");
    }
    const cardToken = createCardToken({
      userId: user.id,
      cardNumber: sanitized,
      holderName: String(holderName || "").trim(),
      expMonth: String(expMonth).padStart(2, "0"),
      expYear: String(expYear),
      brand: String(brand || "").trim() || "generic"
    });
    return res.status(201).json({ ok: true, card_token: cardToken });
  } catch (err) {
    return next(err);
  }
}

export async function listCardTokensHandler(req, res, next) {
  try {
    const tokens = listCardTokensByUser(req.user.id);
    return res.json({ ok: true, card_tokens: tokens });
  } catch (err) {
    return next(err);
  }
}

export async function deleteCardTokenHandler(req, res, next) {
  try {
    const { id } = req.params;
    const removed = deleteCardToken({ userId: req.user.id, tokenId: id });
    if (!removed) {
      throw new AppError("Token não encontrado.", 404, "not_found");
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
