import { AppError, isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { findCheckoutProductBySlug } from "../models/checkoutStore.js";
import { findPayTagById } from "../models/payTagsStore.js";
import { createPayment, getPaymentByIdempotencyKey } from "../services/paymentService.js";
import {
  isPlainObject,
  normalizeCustomer,
  normalizeMetadata,
  parseAmountInput,
  normalizeCurrency,
  validateCardInput,
  isInfinitePayTag
} from "../utils/validation.js";

function sendError(res, status, message, code, requestId = null) {
  const payload = { ok: false, error: message, code };
  if (requestId) payload.requestId = requestId;
  return res.status(status).json(payload);
}

function handleError(res, err, requestId = null) {
  if (isAppError(err)) {
    return sendError(res, err.statusCode, err.message, err.code, requestId);
  }
  logger.error({ err, requestId }, "Unexpected public checkout error");
  return sendError(res, 500, "Erro interno.", "internal_error", requestId);
}

function getIdempotencyKey(req) {
  const key = req.get("Idempotency-Key");
  if (!key) return null;
  const value = String(key).trim();
  return value.length ? value : null;
}

function extractPixArtifacts(tx) {
  const pix = tx?.metadata?.pix || null;
  if (!pix) return null;

  const pix_payload =
    pix?.copia_colar ||
    pix?.qrcode ||
    pix?.qr_code ||
    pix?.qrCode ||
    pix?.payload ||
    null;
  const pix_qr_code_base64 =
    pix?.qr_code_base64 || pix?.qrcode_base64 || pix?.base64 || null;
  const pix_ticket_url = pix?.ticket_url || pix?.ticketUrl || null;
  const pix_expires_at = pix?.expires_at || pix?.expiresAt || null;

  if (!pix_payload && !pix_qr_code_base64 && !pix_ticket_url && !pix_expires_at) {
    return null;
  }

  return {
    ...(pix_payload ? { pix_payload } : {}),
    ...(pix_qr_code_base64 ? { pix_qr_code_base64 } : {}),
    ...(pix_ticket_url ? { pix_ticket_url } : {}),
    ...(pix_expires_at ? { pix_expires_at } : {})
  };
}

function buildPaymentInputFromCheckout({ product, method, body }) {
  const normalizedMethod = String(method || "").trim().toLowerCase();
  if (normalizedMethod !== "pix" && normalizedMethod !== "card") {
    throw new AppError("Metodo invalido.", 400, "invalid_method");
  }

  const currency = normalizeCurrency(product.currency || "BRL");
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new AppError("Moeda invalida.", 400, "invalid_currency");
  }

  // Public checkout: amount comes from the product config to avoid tampering.
  const amountResult = parseAmountInput({ amount: product.price, amount_cents: undefined });
  if (amountResult.error) {
    throw new AppError("Preco do checkout invalido.", 400, "invalid_amount");
  }

  if (body?.metadata !== undefined && !isPlainObject(body.metadata)) {
    throw new AppError("metadata deve ser um objeto.", 400, "invalid_request");
  }
  if (body?.customer !== undefined && !isPlainObject(body.customer)) {
    throw new AppError("customer deve ser um objeto.", 400, "invalid_request");
  }

  const customer = normalizeCustomer(body?.customer);
  const metadata = normalizeMetadata(body?.metadata);

  const card = body?.card;
  const card_hash = body?.card_hash;

  return {
    amount: amountResult.amount,
    amount_cents: amountResult.amount_cents,
    currency,
    method: normalizedMethod,
    customer,
    card,
    card_hash,
    capture: body?.capture,
    metadata
  };
}

export async function createCheckoutPaymentHandler(req, res) {
  const requestId = req?.requestId || null;
  try {
    const { slug } = req.params;
    const product = findCheckoutProductBySlug(slug);
    if (!product) {
      return sendError(res, 404, "Checkout nao encontrado.", "not_found", requestId);
    }

    const method = req.params.method;

    const allowedMethods = product.paymentConfig?.allowedMethods?.length
      ? product.paymentConfig.allowedMethods
      : ["pix", "card"];
    if (!allowedMethods.includes(String(method).toLowerCase())) {
      return sendError(res, 400, "Metodo nao permitido para este checkout.", "invalid_method", requestId);
    }

    const payTag = product.payTagId ? findPayTagById(product.payTagId) : null;
    if (!payTag?.name) {
      return sendError(res, 409, "Checkout sem pay-tag configurada.", "invalid_state", requestId);
    }

    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const existing = getPaymentByIdempotencyKey(idempotencyKey);
      if (existing) {
        return res
          .status(200)
          .set("Location", `/payments/${existing.id}`)
          .set("Idempotency-Status", "replayed")
          .json({ ok: true, transaction: existing, ...(extractPixArtifacts(existing) || {}) });
      }
    }

    const input = buildPaymentInputFromCheckout({ product, method, body: req.body || {} });

    // Enforce checkout-bound metadata.
    input.metadata = {
      ...input.metadata,
      pay_tag: payTag.name,
      checkout_slug: product.slug,
      checkout_product_id: product.id
    };

    // Card validation (when used). InfinitePay uses a hosted checkout link, so it doesn't need raw card data.
    if (input.method === "card" && !isInfinitePayTag(payTag.name)) {
      const cardError = validateCardInput(input.card, input.card_hash);
      if (cardError) {
        return sendError(res, 400, cardError, "invalid_card", requestId);
      }
    }

    const tx = await createPayment({ ...input, idempotencyKey });
    const response = res.status(201).set("Location", `/payments/${tx.id}`);
    if (idempotencyKey) {
      response.set("Idempotency-Status", "created");
    }
    return response.json({ ok: true, transaction: tx, ...(extractPixArtifacts(tx) || {}) });
  } catch (err) {
    return handleError(res, err, requestId);
  }
}
