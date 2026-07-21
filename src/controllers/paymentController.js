import {
  createPayment,
  getPayment,
  getPaymentByProviderReference,
  getPaymentByIdempotencyKey,
  listAllPayments,
  getPaymentStats,
  getPaymentEvents,
  confirmPixPaymentManually,
  capturePayment,
  cancelPayment,
  refundPayment,
  updatePaymentMetadata
} from "../services/paymentService.js";
import { logger } from "../utils/logger.js";
import { isAppError } from "../utils/errors.js";
import {
  isPlainObject,
  normalizeCurrency,
  normalizeMetadata,
  normalizeCustomer,
  normalizeCapture,
  parseAmountInput,
  parseOptionalAmountInput,
  validateCardInput,
  isInfinitePayTag
} from "../utils/validation.js";

const MAX_LIMIT = 200;

function sendError(res, status, message, code) {
  return res.status(status).json({
    ok: false,
    error: message,
    code
  });
}

function handleError(res, err) {
  if (isAppError(err)) {
    return sendError(res, err.statusCode, err.message, err.code);
  }
  logger.error({ err }, "Unexpected error");
  return sendError(res, 500, "Erro interno.", "internal_error");
}

function getPayTagHeader(req) {
  const header = req.get("pay-tag") || req.get("x-pay-tag");
  if (!header) return null;
  const normalized = String(header).trim();
  return normalized.length ? normalized : null;
}

function appendPayTagToMetadata(req, metadata = {}) {
  const payTag = getPayTagHeader(req);
  if (!payTag) return metadata;
  return {
    ...metadata,
    pay_tag: payTag
  };
}

function normalizeOperationMode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized === "black" || normalized === "dark") return "black";
  if (normalized === "white" || normalized === "light") return "white";
  return null;
}

function getOperationModeHeader(req) {
  const header =
    req.get("x-axion-mode") ||
    req.get("x-axion-operation") ||
    req.get("x-operation-mode");
  const mode = normalizeOperationMode(header);
  return mode;
}

function appendOperationModeToMetadata(req, metadata = {}) {
  const mode = getOperationModeHeader(req);
  if (!mode) return metadata;
  if (metadata?.operation_mode) return metadata;
  return {
    ...metadata,
    operation_mode: mode
  };
}

function getIdempotencyKey(req) {
  const key = req.get("Idempotency-Key");
  if (!key) return null;
  const value = String(key).trim();
  return value.length ? value : null;
}

function extractPixPayload(tx) {
  return (
    tx?.metadata?.pix?.copia_colar ||
    tx?.metadata?.pix?.qrcode ||
    tx?.metadata?.pix?.qr_code ||
    tx?.metadata?.pix?.qrCode ||
    tx?.metadata?.pix?.payload ||
    null
  );
}

function extractPixArtifacts(tx) {
  const pix = tx?.metadata?.pix || null;
  if (!pix) return null;

  const pix_payload = extractPixPayload(tx);
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

function buildPaymentInput(body, methodOverride) {
  const method = (methodOverride || body.method || "").toString().toLowerCase();
  if (!method) {
    return { error: 'Campo "method" e obrigatorio.' };
  }
  if (method !== "pix" && method !== "card") {
    return { error: 'Metodo invalido. Use "pix" ou "card".' };
  }

  const amountResult = parseAmountInput({
    amount: body.amount,
    amount_cents: body.amount_cents
  });
  if (amountResult.error) {
    return { error: amountResult.error };
  }

  const currency = normalizeCurrency(body.currency);
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: 'Campo "currency" deve seguir o padrao ISO 4217 (ex: BRL).' };
  }

  const captureResult = normalizeCapture(body.capture);
  if (captureResult.error) {
    return { error: captureResult.error };
  }

  if (body.metadata !== undefined && !isPlainObject(body.metadata)) {
    return { error: 'Campo "metadata" deve ser um objeto.' };
  }
  if (body.customer !== undefined && !isPlainObject(body.customer)) {
    return { error: 'Campo "customer" deve ser um objeto.' };
  }

  const metadata = normalizeMetadata(body.metadata);
  const customer = normalizeCustomer(body.customer);

  const card = body.card;
  const card_hash = body.card_hash;

  return {
    value: {
      amount: amountResult.amount,
      amount_cents: amountResult.amount_cents,
      currency,
      method,
      customer,
      card,
      card_hash,
      capture: captureResult.value,
      metadata
    }
  };
}

function parsePagination(query) {
  let limit = Number(query.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = 50;
  }
  limit = Math.min(limit, MAX_LIMIT);

  let offset = Number(query.offset);
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

export async function createPaymentHandler(req, res) {
  try {
    const input = buildPaymentInput(req.body || {}, null);
    if (input.error) {
      return sendError(res, 400, input.error, "invalid_request");
    }
    input.value.metadata = appendPayTagToMetadata(req, input.value.metadata);
    input.value.metadata = appendOperationModeToMetadata(req, input.value.metadata);
    if (input.value.method === "card" && !isInfinitePayTag(input.value.metadata?.pay_tag)) {
      const cardError = validateCardInput(input.value.card, input.value.card_hash);
      if (cardError) {
        return sendError(res, 400, cardError, "invalid_request");
      }
    }

    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const existing = getPaymentByIdempotencyKey(idempotencyKey);
      if (existing) {
        const pixPayload = existing.method === "pix" ? extractPixPayload(existing) : null;
        return res
          .status(200)
          .set("Location", `/payments/${existing.id}`)
          .set("Idempotency-Status", "replayed")
          .json({ ok: true, transaction: existing, ...(extractPixArtifacts(existing) || {}) });
      }
    }

    const tx = await createPayment({ ...input.value, idempotencyKey });
    const response = res.status(201).set("Location", `/payments/${tx.id}`);
    if (idempotencyKey) {
      response.set("Idempotency-Status", "created");
    }
    return response.json({ ok: true, transaction: tx, ...(extractPixArtifacts(tx) || {}) });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function createPixPaymentHandler(req, res) {
  try {
    const input = buildPaymentInput(req.body || {}, "pix");
    if (input.error) {
      return sendError(res, 400, input.error, "invalid_request");
    }
    input.value.metadata = appendPayTagToMetadata(req, input.value.metadata);
    input.value.metadata = appendOperationModeToMetadata(req, input.value.metadata);

    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const existing = getPaymentByIdempotencyKey(idempotencyKey);
      if (existing) {
        const pixPayload = extractPixPayload(existing);
        return res
          .status(200)
          .set("Location", `/payments/${existing.id}`)
          .set("Idempotency-Status", "replayed")
          .json({ ok: true, transaction: existing, ...(extractPixArtifacts(existing) || {}) });
      }
    }

    const tx = await createPayment({ ...input.value, method: "pix", idempotencyKey });
    const response = res.status(201).set("Location", `/payments/${tx.id}`);
    if (idempotencyKey) {
      response.set("Idempotency-Status", "created");
    }
    return response.json({ ok: true, transaction: tx, ...(extractPixArtifacts(tx) || {}) });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function createCardPaymentHandler(req, res) {
  try {
    const input = buildPaymentInput(req.body || {}, "card");
    if (input.error) {
      return sendError(res, 400, input.error, "invalid_request");
    }
    input.value.metadata = appendPayTagToMetadata(req, input.value.metadata);
    input.value.metadata = appendOperationModeToMetadata(req, input.value.metadata);
    if (!isInfinitePayTag(input.value.metadata?.pay_tag)) {
      const cardError = validateCardInput(input.value.card, input.value.card_hash);
      if (cardError) {
        return sendError(res, 400, cardError, "invalid_request");
      }
    }

    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const existing = getPaymentByIdempotencyKey(idempotencyKey);
      if (existing) {
        return res
          .status(200)
          .set("Location", `/payments/${existing.id}`)
          .set("Idempotency-Status", "replayed")
          .json({ ok: true, transaction: existing });
      }
    }

    const tx = await createPayment({ ...input.value, method: "card", idempotencyKey });
    const response = res.status(201).set("Location", `/payments/${tx.id}`);
    if (idempotencyKey) {
      response.set("Idempotency-Status", "created");
    }
    return response.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getPaymentHandler(req, res) {
  try {
    const { id } = req.params;
    const tx = getPayment(id);
    if (!tx) {
      return sendError(res, 404, "Transacao nao encontrada.", "not_found");
    }
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getPaymentEventsHandler(req, res) {
  try {
    const { id } = req.params;
    const events = getPaymentEvents(id);
    if (!events) {
      return sendError(res, 404, "Transacao nao encontrada.", "not_found");
    }
    return res.json({ ok: true, events });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getPaymentByProviderReferenceHandler(req, res) {
  try {
    const { providerReference } = req.params;
    const tx = getPaymentByProviderReference(providerReference);
    if (!tx) {
      return sendError(res, 404, "Transacao nao encontrada.", "not_found");
    }
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function listPaymentsHandler(req, res) {
  try {
    const { limit, offset } = parsePagination(req.query);
    const filters = {
      status: req.query.status ? String(req.query.status).toLowerCase() : undefined,
      method: req.query.method ? String(req.query.method).toLowerCase() : undefined,
      provider: req.query.provider,
      customerId: req.query.customer_id,
      from: req.query.created_from,
      to: req.query.created_to,
      limit,
      offset
    };

    const result = listAllPayments(filters);
    return res.json({ ok: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function listPaymentsByStatusHandler(req, res) {
  try {
    const { status } = req.params;
    const { limit, offset } = parsePagination(req.query);
    const result = listAllPayments({
      status: String(status).toLowerCase(),
      limit,
      offset
    });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function listPaymentsByMethodHandler(req, res) {
  try {
    const { method } = req.params;
    const { limit, offset } = parsePagination(req.query);
    const result = listAllPayments({
      method: String(method).toLowerCase(),
      limit,
      offset
    });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function getPaymentStatsHandler(req, res) {
  try {
    const stats = getPaymentStats();
    return res.json({ ok: true, stats });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function confirmPixPaymentHandler(req, res) {
  try {
    const { id } = req.params;
    const tx = await confirmPixPaymentManually(id);
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function capturePaymentHandler(req, res) {
  try {
    const { id } = req.params;
    const tx = capturePayment(id);
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function cancelPaymentHandler(req, res) {
  try {
    const { id } = req.params;
    const tx = cancelPayment(id);
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function refundPaymentHandler(req, res) {
  try {
    const { id } = req.params;
    const amountResult = parseOptionalAmountInput({
      amount: req.body?.amount,
      amount_cents: req.body?.amount_cents
    });
    if (amountResult.error) {
      return sendError(res, 400, amountResult.error, "invalid_request");
    }
    const tx = refundPayment(id, amountResult.amount_cents);
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function updatePaymentMetadataHandler(req, res) {
  try {
    if (!isPlainObject(req.body?.metadata)) {
      return sendError(res, 400, 'Campo "metadata" deve ser um objeto.', "invalid_request");
    }
    const { id } = req.params;
    const tx = updatePaymentMetadata(id, req.body.metadata);
    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    return handleError(res, err);
  }
}
