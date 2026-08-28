import Stripe from "stripe";
import { config } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

let stripeInstance = null;

function getStripeClient() {
  if (stripeInstance) return stripeInstance;
  const secretKey = config.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  stripeInstance = new Stripe(secretKey);
  return stripeInstance;
}

/**
 * Cria uma transação de cartão usando Stripe PaymentIntent
 */
export async function createCardTransactionWithStripe({
  amount,
  amount_cents,
  capture,
  customer,
  metadata
}) {
  const stripe = getStripeClient();

  if (!stripe) {
    logger.warn("Stripe secret key não configurada. Usando modo mock para Stripe Cartão.");
    const ref = "STRIPECARDMOCK-" + Date.now();
    const status = capture === false ? "authorized" : "paid";
    return {
      success: true,
      status,
      providerReference: ref,
      raw: {
        id: ref,
        object: "payment_intent",
        amount: amount_cents || Math.round(amount * 100),
        status: status === "paid" ? "succeeded" : "requires_capture",
        client_secret: "mock_client_secret_" + Date.now()
      }
    };
  }

  try {
    const amountCents = Number.isInteger(amount_cents) ? amount_cents : Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "brl",
      capture_method: capture === false ? "manual" : "automatic",
      payment_method_types: ["card"],
      receipt_email: customer?.email || undefined,
      metadata: {
        transactionId: metadata?.transactionId || String(Date.now()),
        description: metadata?.description || "AXION Pay Transaction",
        ...metadata
      }
    });

    const isPaid = paymentIntent.status === "succeeded";
    const isAuth = paymentIntent.status === "requires_capture" || paymentIntent.status === "requires_payment_method";

    return {
      success: isPaid || isAuth,
      status: isPaid ? "paid" : isAuth ? "authorized" : "pending",
      providerReference: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      raw: paymentIntent
    };
  } catch (err) {
    logger.error({ err: err?.message || String(err) }, "Erro ao criar PaymentIntent no Stripe");
    return {
      success: false,
      status: "failed",
      error: err?.message || String(err),
      providerReference: null,
      raw: null
    };
  }
}

/**
 * Cria uma Checkout Session no Stripe para assinaturas ou compras únicas
 */
export async function createCheckoutSessionWithStripe({
  mode = "subscription",
  line_items,
  customer_email,
  success_url,
  cancel_url,
  metadata
}) {
  const stripe = getStripeClient();

  if (!stripe) {
    logger.warn("Stripe secret key não configurada. Modo mock para Checkout Session.");
    return {
      success: true,
      url: "https://checkout.stripe.com/mock-session-" + Date.now(),
      sessionId: "cs_mock_" + Date.now()
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode,
      line_items,
      customer_email,
      success_url,
      cancel_url,
      metadata
    });

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
      raw: session
    };
  } catch (err) {
    logger.error({ err: err?.message || String(err) }, "Erro ao criar Checkout Session no Stripe");
    return {
      success: false,
      error: err?.message || String(err)
    };
  }
}

/**
 * Valida a assinatura de um Webhook recebido do Stripe
 */
export function verifyStripeWebhookSignature(payload, signature) {
  const stripe = getStripeClient();
  const webhookSecret = config.stripe?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    logger.warn("Stripe client ou Webhook Secret ausente. Pulando validação estrita (modo mock).");
    return { valid: true, event: typeof payload === "string" ? JSON.parse(payload) : payload };
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return { valid: true, event };
  } catch (err) {
    logger.error({ err: err.message }, "Falha na verificação de assinatura do Webhook Stripe");
    return { valid: false, error: err.message };
  }
}
