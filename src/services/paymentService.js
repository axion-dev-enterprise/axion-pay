import { generateTransactionId } from "../utils/idGenerator.js";
import {
  createTransaction,
  updateTransaction,
  getTransaction,
  listTransactions,
  findTransactionByProviderReference,
  getTransactionEvents,
  appendEvent,
  mergeTransactionMetadata,
  setIdempotencyKey,
  getTransactionByIdempotencyKey
} from "../models/transactionStore.js";
import { createPixCharge, confirmPixPayment } from "./providers/pixProviderMock.js";
import { createCardTransactionWithWoovi } from "./providers/wooviProvider.js";
import { createCardTransactionWithInfinite } from "./providers/infiniteProvider.js";
import { createCardTransactionWithMock } from "./providers/cardProviderMock.js";
import { createPixTransactionWithMercadoPago, createCardTransactionWithMercadoPago } from "./providers/mercadopagoProvider.js";
import { createPixTransactionWithPagarme, createCardTransactionWithPagarme } from "./providers/pagarmeProvider.js";
import { createPixTransactionWithBancoCentral } from "./providers/bancoCentralProvider.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import { buildCardSummary, normalizeMetadata } from "../utils/validation.js";
import { redactSensitiveFields } from "../utils/redact.js";
import { config } from "../config/env.js";

function recordEvent(transactionId, type, payload) {
  appendEvent(transactionId, {
    type,
    payload
  });
}

function normalizeProviderName(value) {
  if (value === undefined || value === null) {
    return "";
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized;
}

function normalizePayTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function normalizeOperationMode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  if (normalized === "black" || normalized === "dark") return "black";
  if (normalized === "white" || normalized === "light") return "white";
  return "";
}

function isInfinitePayTag(normalizedPayTag) {
  // InfinitePay is supported for card transactions in this codebase.
  return (
    normalizedPayTag === "anne-tom" ||
    normalizedPayTag === "annetom" ||
    normalizedPayTag === "axion-pdv" ||
    normalizedPayTag === "axionpdv"
  );
}

/**
 * Cria uma transacao de pagamento (PIX ou Cartao).
 */
export async function createPayment({
  amount,
  amount_cents,
  currency,
  method,
  customer,
  card,
  card_hash,
  capture,
  metadata,
  idempotencyKey
}) {
  if (idempotencyKey) {
    const existing = getTransactionByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { ...existing, _replayed: true };
    }
  }

  if (method !== "pix" && method !== "card") {
    throw new AppError("Metodo de pagamento nao suportado.", 400, "invalid_method");
  }

  const id = generateTransactionId();
  const baseMetadata = redactSensitiveFields(normalizeMetadata(metadata));
  const mergedMetadata = {
    ...baseMetadata,
    transactionId: id
  };
  const normalizedProviderHint = normalizeProviderName(baseMetadata.provider);
  const rawPayTag = metadata?.pay_tag ? String(metadata.pay_tag).trim() : "";
  const normalizedPayTag = normalizePayTag(rawPayTag);
  const isInfiniteTag = isInfinitePayTag(normalizedPayTag);
  const operationMode = normalizeOperationMode(metadata?.operation_mode || baseMetadata.operation_mode);
  if (rawPayTag) {
    mergedMetadata.pay_tag = rawPayTag;
  }
  if (operationMode) {
    mergedMetadata.operation_mode = operationMode;
  }

  const methodDetails = method === "card" ? buildCardSummary(card) : null;

  const tx = createTransaction({
    id,
    amount,
    amount_cents,
    currency,
    method,
    capture,
    customer,
    methodDetails,
    metadata: mergedMetadata
  });

  if (idempotencyKey) {
    setIdempotencyKey(idempotencyKey, id);
  }

  logger.info({ transactionId: id, method }, "Criando pagamento");

  if (method === "pix") {
    // Determinar qual provider usar baseado no metadata ou padrão
    const defaultPixProvider =
      normalizeProviderName(config.providers.defaultPix) || "mock";
    let provider = normalizedProviderHint || defaultPixProvider;

    // Routing: white (default) -> Banco Central estatico; black (explicit) -> MercadoPago.
    // O cliente deve indicar black via metadata.operation_mode (ex: header x-axion-mode: black).
    if (!normalizedProviderHint && config.env !== "test") {
      if (operationMode === "black") {
        provider = "mercadopago";
      } else {
        provider = "bancocentral";
      }
    }
    if (config.env === "test") {
      provider = "mock";
    }
    mergedMetadata.provider = provider;

    let result;
    if (provider === "mercadopago") {
      result = await createPixTransactionWithMercadoPago({
        amount,
        amount_cents,
        customer,
        metadata: mergedMetadata
      });
    } else if (provider === "pagarme") {
      result = await createPixTransactionWithPagarme({
        amount,
        amount_cents,
        customer,
        metadata: mergedMetadata
      });
    } else if (provider === "bancocentral") {
      result = await createPixTransactionWithBancoCentral({
        amount,
        amount_cents,
        customer,
        metadata: mergedMetadata
      });
    } else {
      // Default: mock
      result = await createPixCharge({
        amount,
        amount_cents,
        currency,
        customer,
        metadata: mergedMetadata
      });
    }

    if (result.success) {
      return updateTransaction(id, {
        status: result.status,
        provider: result.provider || provider,
        providerReference: result.providerReference,
        metadata: {
          ...tx.metadata,
          pix: result.raw
        }
      });
    }
    return updateTransaction(id, {
      status: "failed",
      metadata: {
        ...tx.metadata,
        error: result.error || "Falha ao criar cobrança PIX"
      }
    });
  }

  if (method === "card") {
    // Determinar qual provider usar baseado no metadata ou padrão
    const defaultCardProvider =
      normalizeProviderName(config.card.defaultProvider) ||
      normalizeProviderName(config.providers.defaultCard) ||
      "infinite";
    let provider = normalizedProviderHint || defaultCardProvider;

    // Routing:
    // - AXION-PDV / ANNETOM / ANNE-TOM: InfinitePay (cartao)
    // - black (explicit): MercadoPago (cartao)
    if (!normalizedProviderHint && config.env !== "test") {
      if (isInfiniteTag) {
        provider = "infinite";
      } else if (operationMode === "black") {
        provider = "mercadopago";
      }
    }
    if (isInfiniteTag) {
      provider = "infinite";
    }
    if (!isInfiniteTag && config.env === "test") {
      provider = "mock";
    }
    mergedMetadata.provider = provider;
    
    let result;
    if (provider === "mock") {
      result = await createCardTransactionWithMock({
        amount,
        amount_cents,
        capture,
        card,
        card_hash,
        customer,
        metadata: mergedMetadata
      });
    } else if (provider === "mercadopago") {
      result = await createCardTransactionWithMercadoPago({
        amount,
        amount_cents,
        capture,
        card,
        card_hash,
        customer,
        metadata: mergedMetadata
      });
    } else if (provider === "pagarme") {
      result = await createCardTransactionWithPagarme({
        amount,
        amount_cents,
        capture,
        card,
        card_hash,
        customer,
        metadata: mergedMetadata
      });
    } else if (provider === "woovi") {
      result = await createCardTransactionWithWoovi({
        amount,
        amount_cents,
        capture,
        card,
        card_hash,
        customer,
        metadata: mergedMetadata
      });
    } else {
      // Default: infinite
      result = await createCardTransactionWithInfinite({
        amount_cents,
        customer,
        metadata: mergedMetadata
      });
    }

    if (result.success) {
      return updateTransaction(id, {
        status: result.status,
        provider: result.provider || provider,
        providerReference: result.providerReference,
        metadata: {
          ...tx.metadata,
          providerRaw: redactSensitiveFields(result.raw)
        }
      });
    }
    return updateTransaction(id, {
      status: "failed",
      metadata: {
        ...tx.metadata,
        error: redactSensitiveFields(result.error || "Falha ao processar cartão")
      }
    });
  }
}

export function getPayment(transactionId) {
  return getTransaction(transactionId);
}

export function getPaymentByProviderReference(providerReference) {
  return findTransactionByProviderReference(providerReference);
}

export function getPaymentByIdempotencyKey(idempotencyKey) {
  return getTransactionByIdempotencyKey(idempotencyKey);
}

export function listAllPayments(filters) {
  const { limit = 50, offset = 0, ...criteria } = filters || {};
  const list = listTransactions(criteria);
  const total = list.length;
  const sliced = list.slice(offset, offset + limit);
  return {
    total,
    count: sliced.length,
    limit,
    offset,
    transactions: sliced
  };
}

export function getPaymentStats() {
  const list = listTransactions();
  const stats = {
    total: list.length,
    total_amount_cents: 0,
    total_paid_cents: 0,
    by_status: {},
    by_method: {}
  };

  for (const tx of list) {
    stats.total_amount_cents += tx.amount_cents || 0;
    stats.by_status[tx.status] = (stats.by_status[tx.status] || 0) + 1;
    stats.by_method[tx.method] = (stats.by_method[tx.method] || 0) + 1;
    if (tx.status === "paid") {
      stats.total_paid_cents += tx.amount_cents || 0;
    }
  }

  return stats;
}

export function getPaymentEvents(transactionId) {
  return getTransactionEvents(transactionId);
}

export async function confirmPixPaymentManually(transactionId) {
  const tx = getTransaction(transactionId);
  if (!tx) {
    throw new AppError("Transacao nao encontrada.", 404, "not_found");
  }
  if (tx.method !== "pix") {
    throw new AppError("Metodo invalido para confirmacao PIX.", 400, "invalid_method");
  }
  if (!tx.providerReference) {
    throw new AppError("Transacao sem referencia do provedor.", 409, "invalid_state");
  }
  if (tx.status === "paid") {
    return tx;
  }

  const result = await confirmPixPayment(tx.providerReference);
  if (result.success) {
    const updated = updateTransaction(tx.id, {
      status: result.status,
      metadata: {
        ...tx.metadata,
        pixConfirmation: result.raw
      }
    });
    recordEvent(tx.id, "pix_confirmed", result.raw);
    return updated;
  }

  const failed = updateTransaction(tx.id, {
    status: "failed",
    metadata: {
      ...tx.metadata,
      error: result.error || "Falha ao confirmar PIX"
    }
  });
  recordEvent(tx.id, "pix_failed", { error: result.error || "Falha ao confirmar PIX" });
  return failed;
}

export function capturePayment(transactionId) {
  const tx = getTransaction(transactionId);
  if (!tx) {
    throw new AppError("Transacao nao encontrada.", 404, "not_found");
  }
  if (tx.method !== "card") {
    throw new AppError("Metodo invalido para captura.", 400, "invalid_method");
  }
  if (tx.status !== "authorized") {
    throw new AppError("Status invalido para captura.", 409, "invalid_status");
  }

  const updated = updateTransaction(transactionId, {
    status: "paid"
  });
  recordEvent(transactionId, "card_captured", null);
  return updated;
}

export function cancelPayment(transactionId) {
  const tx = getTransaction(transactionId);
  if (!tx) {
    throw new AppError("Transacao nao encontrada.", 404, "not_found");
  }
  if (!["pending", "authorized"].includes(tx.status)) {
    throw new AppError("Status invalido para cancelamento.", 409, "invalid_status");
  }

  const updated = updateTransaction(transactionId, {
    status: "canceled"
  });
  recordEvent(transactionId, "payment_canceled", null);
  return updated;
}

export function refundPayment(transactionId, amount_cents = null) {
  const tx = getTransaction(transactionId);
  if (!tx) {
    throw new AppError("Transacao nao encontrada.", 404, "not_found");
  }
  if (tx.status !== "paid") {
    throw new AppError("Status invalido para reembolso.", 409, "invalid_status");
  }

  if (amount_cents !== null && amount_cents > tx.amount_cents) {
    throw new AppError("Valor de reembolso maior que o valor da transacao.", 400, "invalid_amount");
  }

  const refundDetails = {
    amount_cents: amount_cents ?? tx.amount_cents
  };

  const updated = updateTransaction(transactionId, {
    status: "refunded",
    metadata: {
      ...tx.metadata,
      refund: refundDetails
    }
  });
  recordEvent(transactionId, "payment_refunded", refundDetails);
  return updated;
}

export function updatePaymentMetadata(transactionId, metadataPatch) {
  const safePatch = redactSensitiveFields(metadataPatch);
  const tx = mergeTransactionMetadata(transactionId, safePatch);
  if (!tx) {
    throw new AppError("Transacao nao encontrada.", 404, "not_found");
  }
  recordEvent(transactionId, "metadata_updated", safePatch);
  return tx;
}

export async function handlePixWebhook({ providerReference, event }) {
  const tx = findTransactionByProviderReference(providerReference);
  if (!tx) {
    logger.warn({ providerReference }, "Transacao nao encontrada para webhook PIX");
    return null;
  }

  if (event === "PIX_CONFIRMED") {
    const result = await confirmPixPayment(providerReference);
    if (result.success) {
      const updated = updateTransaction(tx.id, {
        status: result.status,
        metadata: {
          ...tx.metadata,
          pixConfirmation: result.raw
        }
      });
      recordEvent(tx.id, "pix_confirmed", result.raw);
      return updated;
    }
    const failed = updateTransaction(tx.id, {
      status: "failed",
      metadata: {
        ...tx.metadata,
        error: result.error || "Falha ao confirmar PIX"
      }
    });
    recordEvent(tx.id, "pix_failed", { error: result.error || "Falha ao confirmar PIX" });
    return failed;
  }

  if (event === "PIX_FAILED") {
    const updated = updateTransaction(tx.id, {
      status: "failed"
    });
    recordEvent(tx.id, "pix_failed", null);
    return updated;
  }

  if (event === "PIX_EXPIRED") {
    const updated = updateTransaction(tx.id, {
      status: "expired"
    });
    recordEvent(tx.id, "pix_expired", null);
    return updated;
  }

  return tx;
}

export async function handleWooviWebhook(payload) {
  const data = payload?.data || payload || {};
  const metadata =
    data.metadata || data.charge?.metadata || data.transaction?.metadata || data.pix?.metadata || {};
  const rawStatus = data.status || data.charge?.status || data.transaction?.status;
  const providerReference =
    data.id ||
    data.charge?.id ||
    data.transaction?.id ||
    data.correlationID ||
    data.correlationId ||
    data.charge?.correlationID ||
    data.charge?.correlationId ||
    null;

  let tx = null;
  const transactionId = metadata?.transactionId || data.transactionId || data.referenceId;
  if (transactionId) {
    tx = getTransaction(transactionId);
  }
  if (!tx && providerReference) {
    tx = findTransactionByProviderReference(providerReference);
  }
  if (!tx) {
    logger.warn({ transactionId, providerReference }, "Transacao nao encontrada para webhook Woovi");
    return null;
  }

  let mappedStatus = tx.status;
  const status = String(rawStatus || "").toLowerCase();
  if (["paid", "completed", "approved", "confirmed", "settled"].includes(status)) {
    mappedStatus = "paid";
  } else if (["authorized", "auth", "pre_authorized"].includes(status)) {
    mappedStatus = "authorized";
  } else if (["refused", "failed", "error"].includes(status)) {
    mappedStatus = "failed";
  } else if (["refunded", "chargeback"].includes(status)) {
    mappedStatus = "refunded";
  } else if (["pending", "created", "waiting"].includes(status)) {
    mappedStatus = "pending";
  } else if (["canceled", "cancelled"].includes(status)) {
    mappedStatus = "canceled";
  } else if (["expired"].includes(status)) {
    mappedStatus = "expired";
  }

  const updated = updateTransaction(tx.id, {
    status: mappedStatus,
    providerReference: providerReference ? String(providerReference) : tx.providerReference,
    metadata: {
      ...tx.metadata,
      providerWebhook: redactSensitiveFields(payload)
    }
  });
  recordEvent(tx.id, "provider_webhook", { provider: "woovi", status: mappedStatus });
  return updated;
}

export async function handleInfinitePayWebhook(payload) {
  const { id, status, order_nsu, metadata } = payload || {};

  let tx = null;
  
  // 1. Tenta buscar pelo ID da transação interna (order_nsu)
  if (order_nsu) {
    tx = getTransaction(order_nsu);
  }

  // 2. Se não achar, tenta pelo ID da InfinitePay (providerReference)
  if (!tx && id) {
    tx = findTransactionByProviderReference(id);
  }

  if (!tx) {
    logger.warn({ payload }, "Webhook InfinitePay: Transacao nao encontrada");
    return null;
  }

  let mappedStatus = tx.status;
  const normalizedStatus = String(status || "").toLowerCase();

  if (["paid", "approved", "settled"].includes(normalizedStatus)) {
    mappedStatus = "paid";
  } else if (["refused", "failed", "denied"].includes(normalizedStatus)) {
    mappedStatus = "failed";
  } else if (["canceled", "voided"].includes(normalizedStatus)) {
    mappedStatus = "canceled";
  }

  const updated = updateTransaction(tx.id, {
    status: mappedStatus,
    metadata: {
      ...tx.metadata,
      infiniteWebhook: redactSensitiveFields(payload)
    }
  });
  recordEvent(tx.id, "provider_webhook", { provider: "infinitepay", status: mappedStatus });
  return updated;
}
