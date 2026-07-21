import express from "express";
import {
  pagarmeWebhookHandler,
  pixWebhookHandler,
  wooviWebhookHandler
} from "../controllers/webhookController.js";
import { handleInfinitePayWebhook } from "../services/paymentService.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.post("/pix", pixWebhookHandler);
router.post("/woovi", wooviWebhookHandler);
router.post("/pagarme", pagarmeWebhookHandler);

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
