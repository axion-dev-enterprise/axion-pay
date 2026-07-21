import axios from "axios";
import { config } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Cria uma transação PIX usando Pagar.me
 */
export async function createPixTransactionWithPagarme({
  amount,
  amount_cents,
  customer,
  metadata
}) {
  const apiKey = config.pagarme.apiKey;
  const baseURL = config.pagarme.baseURL;

  if (!apiKey) {
    logger.warn("Pagar.me API key não configurada. Usando modo mock para PIX.");
    const ref = "PGRPIXMOCK-" + Date.now();
    return {
      success: true,
      status: "pending",
      providerReference: ref,
      raw: {
        qr_code: "mock_qr_code",
        qr_code_base64: "mock_base64",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    };
  }

  try {
    const client = axios.create({
      baseURL,
      auth: {
        username: apiKey,
        password: ""
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    const amountCents = Number.isInteger(amount_cents) ? amount_cents : Math.round(amount * 100);

    const payload = {
      amount: amountCents,
      payment_method: "pix",
      pix: {
        expires_in: 86400, // 24 horas em segundos
        additional_info: [
          {
            name: "Descrição",
            value: metadata?.description || `Pagamento ${metadata?.transactionId || Date.now()}`
          }
        ]
      },
      customer: customer
        ? {
            external_id: String(customer.id || customer.document || customer.email || "customer"),
            name: customer.name,
            email: customer.email,
            type: "individual",
            country: "br",
            documents: customer.document
              ? [
                  {
                    type: "cpf",
                    number: String(customer.document).replace(/\D/g, "")
                  }
                ]
              : []
          }
        : undefined,
      metadata
    };

    logger.info({ amountCents }, "Enviando transação PIX para Pagar.me");

    const response = await client.post("/transactions", payload);
    const data = response.data || {};

    if (data.status === "pending") {
      return {
        success: true,
        status: "pending",
        providerReference: String(data.id),
        raw: {
          qr_code: data.pix?.qr_code,
          qr_code_base64: data.pix?.qr_code_base64,
          expires_at: data.pix?.expires_at
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
      "Erro ao criar transação PIX na Pagar.me"
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
 * Cria uma transacao de cartao usando modelo semelhante ao Pagar.me.
 *
 * Em producao, voce deve:
 *  - Utilizar `card_hash` gerado no frontend (PCI-friendly);
 *  - Configurar `PAGARME_API_KEY` e `PAGARME_BASE_URL` no .env;
 *  - Tratar erros conforme documentacao oficial.
 */
export async function createCardTransactionWithPagarme({
  amount,
  amount_cents,
  currency,
  capture,
  card,
  card_hash,
  customer,
  metadata
}) {
  const apiKey = config.pagarme.apiKey;
  const baseURL = config.pagarme.baseURL;

  // Se nao houver API key, simulamos a transacao (modo mock).
  if (!apiKey) {
    logger.warn("Pagar.me API key nao configurada. Usando modo mock para cartao.");
    const ref = "PGRMOCK-" + Date.now();
    const status = capture === false ? "authorized" : "paid";
    return {
      success: true,
      status,
      providerReference: ref,
      raw: {
        acquirer: "mock-acquirer",
        authorization_code: "MOCK123",
        tid: "TIDMOCK",
        nsu: "NSUMOCK",
        message: "Transacao aprovada (mock)"
      }
    };
  }

  try {
    const client = axios.create({
      baseURL,
      auth: {
        username: apiKey,
        password: ""
      },
      headers: {
        "Content-Type": "application/json"
      }
    });

    // A Pagar.me normalmente recebe valor em centavos (inteiro).
    const amountCents = Number.isInteger(amount_cents) ? amount_cents : Math.round(amount * 100);

    const payload = {
      amount: amountCents,
      payment_method: "credit_card",
      capture: capture !== false,
      metadata,
      customer: customer
        ? {
            external_id: String(customer.id || customer.document || customer.email || "customer"),
            name: customer.name,
            email: customer.email,
            type: "individual",
            country: "br",
            documents: customer.document
              ? [
                  {
                    type: "cpf",
                    number: String(customer.document).replace(/\D/g, "")
                  }
                ]
              : []
          }
        : undefined
    };

    // Preferir card_hash. Dados de cartao so devem ser manipulados em ambiente PCI.
    if (card_hash) {
      payload.card_hash = card_hash;
    } else if (card) {
      payload.card_number = card.number;
      payload.card_holder_name = card.holder_name;
      const month = String(card.exp_month).padStart(2, "0");
      const year = String(card.exp_year).slice(-2);
      payload.card_expiration_date = `${month}${year}`; // MMYY
      payload.card_cvv = card.cvv;
    }

    logger.info({ amountCents }, "Enviando transacao para Pagar.me");

    const response = await client.post("/transactions", payload);

    const data = response.data || {};
    let status = "failed";
    if (data.status === "paid") {
      status = "paid";
    } else if (data.status === "authorized") {
      status = capture === false ? "authorized" : "paid";
    }

    return {
      success: status === "paid" || status === "authorized",
      status,
      providerReference: String(data.id || data.tid || "unknown"),
      raw: data
    };
  } catch (err) {
    logger.error(
      { err: err?.response?.data || err?.message },
      "Erro ao criar transacao na Pagar.me"
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
