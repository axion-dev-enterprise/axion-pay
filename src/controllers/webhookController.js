import { handlePixWebhook, handleWooviWebhook } from "../services/paymentService.js";
import { config } from "../config/env.js";
import { verifyWebhookSignature } from "../utils/webhook.js";
import { logger } from "../utils/logger.js";

function getFirstHeader(req, names) {
  for (const name of names) {
    const value = req.get(name);
    if (value) return value;
  }
  return null;
}

function sendError(res, status, message, code) {
  return res.status(status).json({
    ok: false,
    error: message,
    code
  });
}

export async function pixWebhookHandler(req, res) {
  try {
    const signature = getFirstHeader(req, ["x-pix-signature", "x-webhook-signature"]);
    const timestamp = getFirstHeader(req, [
      "x-pix-timestamp",
      "x-webhook-timestamp",
      "x-request-timestamp"
    ]);
    const verification = verifyWebhookSignature({
      rawBody: req.rawBody,
      signatureHeader: signature,
      secret: config.webhooks.pixSecret,
      timestampHeader: timestamp,
      toleranceSeconds: config.webhooks.toleranceSeconds,
      requireTimestamp: config.webhooks.requireTimestamp
    });
    if (!verification.ok) {
      return sendError(res, 401, verification.error, "invalid_signature");
    }
    if (verification.skipped) {
      logger.warn("PIX webhook sem segredo configurado. Verificacao ignorada.");
    }

    const { providerReference, event } = req.body || {};
    if (!providerReference || !event) {
      return sendError(res, 400, 'Campos obrigatorios: "providerReference" e "event".', "invalid_request");
    }

    const tx = await handlePixWebhook({ providerReference, event });
    if (!tx) {
      return sendError(res, 404, "Transacao nao encontrada para webhook PIX.", "not_found");
    }

    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    logger.error({ err }, "Erro no webhook PIX");
    return sendError(res, 500, "Erro interno ao processar webhook PIX.", "internal_error");
  }
}

export async function pagarmeWebhookHandler(req, res) {
  try {
    const signature = getFirstHeader(req, [
      "x-woovi-signature",
      "x-pagarme-signature",
      "x-hub-signature",
      "x-webhook-signature"
    ]);
    const timestamp = getFirstHeader(req, [
      "x-woovi-timestamp",
      "x-pagarme-timestamp",
      "x-webhook-timestamp",
      "x-request-timestamp"
    ]);
    const verification = verifyWebhookSignature({
      rawBody: req.rawBody,
      signatureHeader: signature,
      secret: config.webhooks.wooviSecret || config.webhooks.pagarmeSecret,
      timestampHeader: timestamp,
      toleranceSeconds: config.webhooks.toleranceSeconds,
      requireTimestamp: config.webhooks.requireTimestamp
    });
    if (!verification.ok) {
      return sendError(res, 401, verification.error, "invalid_signature");
    }
    if (verification.skipped) {
      logger.warn("Webhook Woovi sem segredo configurado. Verificacao ignorada.");
    }

    const payload = req.body || {};
    const tx = await handleWooviWebhook(payload);
    if (!tx) {
      return res.json({
        ok: false,
        message: "Nenhuma transacao atualizada a partir deste webhook."
      });
    }

    return res.json({ ok: true, transaction: tx });
  } catch (err) {
    logger.error({ err }, "Erro no webhook Woovi");
    return sendError(res, 500, "Erro interno ao processar webhook Woovi.", "internal_error");
  }
}

export async function wooviWebhookHandler(req, res) {
  return pagarmeWebhookHandler(req, res);
}
