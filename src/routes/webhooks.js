import express from "express";
import {
  pagarmeWebhookHandler,
  pixWebhookHandler,
  wooviWebhookHandler
} from "../controllers/webhookController.js";
import { handleInfinitePayWebhook } from "../services/paymentService.js";
import { verifyStripeWebhookSignature } from "../services/providers/stripeProvider.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.post("/pix", pixWebhookHandler);
router.post("/woovi", wooviWebhookHandler);
router.post("/pagarme", pagarmeWebhookHandler);

router.post("/stripe", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  const verification = verifyStripeWebhookSignature(req.body, sig);
  if (!verification.valid) {
    return res.status(400).json({ ok: false, error: verification.error });
  }
  logger.info({ eventType: verification.event?.type }, "Stripe webhook recebido com sucesso");
  return res.json({ received: true });
});

router.post("/infinitepay", async (req, res) => {
  try {
    const result = await handleInfinitePayWebhook(req.body);
    if (!result) {
      return res.status(404).json({ ok: false, message: "Transaction not found" });
    }
    return res.json({ ok: true, transaction: result });
  } catch (error) {
    logger.error({ error }, "Erro no webhook InfinitePay");
    return res.status(500).json({ ok: false });
  }
});

export default router;
