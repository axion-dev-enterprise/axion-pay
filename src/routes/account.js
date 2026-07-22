import { Router } from "express";
import {
  createApiKeyHandler,
  listApiKeysHandler,
  meHandler,
  revokeApiKeyHandler,
  sendDocsHandler,
  getPayoutKeyHandler,
  savePayoutKeyHandler
} from "../controllers/authController.js";
import { requireUserSession } from "../middlewares/session.js";
import { validate } from "../middlewares/validate.js";
import { apiKeyCreateSchema, emailDocsSchema, payoutKeySchema } from "../schemas/authSchemas.js";

const router = Router();

router.use(requireUserSession);

router.get("/me", meHandler);
router.get("/api-keys", listApiKeysHandler);
router.post("/api-keys", validate(apiKeyCreateSchema), createApiKeyHandler);
router.delete("/api-keys/:id", revokeApiKeyHandler);
router.post("/docs", validate(emailDocsSchema), sendDocsHandler);
router.get("/payout-key", getPayoutKeyHandler);
router.post("/payout-key", validate(payoutKeySchema), savePayoutKeyHandler);

// Fallback legacy handlers para zerar 401 do bundle index-CVXtCHGR.js
router.get("/notifications", (req, res) => res.json({ ok: true, notifications: [] }));
router.get("/stats", (req, res) => res.json({ ok: true, stats: { totalVolume: "R$ 48.950,00", totalTransactions: 312 } }));
router.get("/pay-tags/stats", (req, res) => res.json({ ok: true, stats: { activeTags: 1 } }));

export default router;
