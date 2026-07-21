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

router.get("/me", requireUserSession, meHandler);
router.get("/api-keys", requireUserSession, listApiKeysHandler);
router.post("/api-keys", requireUserSession, validate(apiKeyCreateSchema), createApiKeyHandler);
router.delete("/api-keys/:id", requireUserSession, revokeApiKeyHandler);
router.post("/docs", requireUserSession, validate(emailDocsSchema), sendDocsHandler);
router.get("/payout-key", requireUserSession, getPayoutKeyHandler);
router.post("/payout-key", requireUserSession, validate(payoutKeySchema), savePayoutKeyHandler);

export default router;
