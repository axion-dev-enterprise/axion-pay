import axios from "axios";
import { config } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Cria uma transação PIX usando MercadoPago
 */
export async function createPixTransactionWithMercadoPago({
  amount,
  amount_cents,
  customer,
  metadata
}) {
  const accessToken = config.mercadopago.accessToken;
  const baseURL = config.mercadopago.baseURL;

  if (!accessToken) {
    logger.warn("MercadoPago access token não configurado. Usando modo mock para PIX.");
    const ref = "MPPIXMOCK-" + Date.now();
    return {
      success: true,
      status: "pending",
      providerReference: ref,
      raw: {
        qr_code: "mock_qr_code",
        qr_code_base64: "mock_base64",
        ticket_url: "https://mock.ticket.url"
      }
    };
  }

  const idempotencyKey =
    metadata?.transactionId || `mp-pix-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const client = axios.create({
      baseURL,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      }
    });

    const amountCents = Number.isInteger(amount_cents) ? amount_cents : Math.round(amount * 100);
    const amountFloat = amountCents / 100;

    const payload = {
      transaction_amount: amountFloat,
      description: metadata?.description || `Pagamento ${metadata?.transactionId || Date.now()}`,
      payment_method_id: "pix",
      payer: {
        email: customer?.email || "customer@example.com",
        first_name: customer?.name?.split(" ")[0] || "Cliente",
        last_name: customer?.name?.split(" ").slice(1).join(" ") || "",
        identification: {
          type: "CPF",
          number: customer?.document || "00000000000"
        }
      },
      external_reference: metadata?.transactionId || String(Date.now())
    };

    logger.info({ amountCents, idempotencyKey }, "Enviando transação PIX para MercadoPago");

    const response = await client.post("/v1/payments", payload);
    const data = response.data || {};

    if (data.status === "pending") {
      return {
        success: true,
        status: "pending",
        providerReference: String(data.id),
        raw: {
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
          expires_at: data.date_of_expiration
        }
      };
    } else {
      return {
        success: false,
        status: "failed",
        error: "Status inesperado: " + data.status,
        providerReference: String(data.id),
        raw: data
      };
    }
  } catch (err) {
    logger.error(
      { err: err?.response?.data || err?.message },
      "Erro ao criar transação PIX no MercadoPago"
    );
    return {
      success: false,
      status: "failed",
      error: err?.response?.data || String(err),
      providerReference: null,
      raw: null
    };
  }
}

/**
 * Cria uma transação de cartão usando MercadoPago
 */
export async function createCardTransactionWithMercadoPago({
  amount,
  amount_cents,
  capture,
  card,
  card_hash,
  customer,
  metadata
}) {
  const accessToken = config.mercadopago.accessToken;
  const baseURL = config.mercadopago.baseURL;

  if (!accessToken) {
    logger.warn("MercadoPago access token não configurado. Usando modo mock para cartão.");
    const ref = "MPCARDMOCK-" + Date.now();
    const status = capture === false ? "authorized" : "paid";
    return {
      success: true,
      status,
      providerReference: ref,
      raw: {
        acquirer: "mock-acquirer",
        authorization_code: "MOCKMP123",
        tid: "TIDMOCKMP",
        nsu: "NSUMOCKMP",
        message: "Transação aprovada (mock MercadoPago)"
      }
    };
  }

  const idempotencyKey =
    metadata?.transactionId || `mp-card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const client = axios.create({
      baseURL,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      }
    });

    const amountCents = Number.isInteger(amount_cents) ? amount_cents : Math.round(amount * 100);
    const amountFloat = amountCents / 100;

    const payload = {
      transaction_amount: amountFloat,
      description: metadata?.description || `Pagamento ${metadata?.transactionId || Date.now()}`,
      payment_method_id: "master", // ou "visa" dependendo do cartão
      payer: {
        email: customer?.email || "customer@example.com",
        first_name: customer?.name?.split(" ")[0] || "Cliente",
        last_name: customer?.name?.split(" ").slice(1).join(" ") || "",
        identification: {
          type: "CPF",
          number: customer?.document || "00000000000"
        }
      },
      external_reference: metadata?.transactionId || String(Date.now()),
      capture: capture !== false
    };

    // Usar token do cartão (PCI-friendly) ou dados diretos (não recomendado para produção)
    if (card_hash) {
      payload.token = card_hash;
    } else if (card) {
      payload.card = {
        number: card.number,
        holder_name: card.holder_name,
        expiration_month: String(card.exp_month).padStart(2, "0"),
        expiration_year: String(card.exp_year),
        security_code: card.cvv
      };
    }

    logger.info({ amountCents }, "Enviando transação de cartão para MercadoPago");

    const response = await client.post("/v1/payments", payload);
    const data = response.data || {};

    let status = "failed";
    if (data.status === "approved") {
      status = capture === false ? "authorized" : "paid";
    } else if (data.status === "authorized") {
      status = "authorized";
    }

    return {
      success: status === "paid" || status === "authorized",
      status,
      providerReference: String(data.id),
      raw: data
    };
  } catch (err) {
    logger.error(
      { err: err?.response?.data || err?.message },
      "Erro ao criar transação de cartão no MercadoPago"
    );
    return {
      success: false,
      status: "failed",
      error: err?.response?.data || String(err),
      providerReference: null,
      raw: null
    };
  }
}
