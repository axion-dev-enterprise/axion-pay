import express from "express";
import {
  createPayTagHandler,
  listPayTagsHandler,
  togglePayTagHandler,
  deletePayTagHandler
} from "../controllers/payTagsController.js";
import {
  createApiKeyHandler,
  listApiKeysHandler
} from "../controllers/authController.js";
import { requireUserSession } from "../middlewares/session.js";
import { overviewHandler, listClientInsightsHandler } from "../controllers/dashboardController.js";
import { validate } from "../middlewares/validate.js";
import { createPayTagSchema, togglePayTagSchema } from "../schemas/payTagsSchemas.js";
import { apiKeyCreateSchema } from "../schemas/authSchemas.js";
import {
  createPayoutRequestHandler,
  listUserPayoutRequestsHandler
} from "../controllers/payoutController.js";
import {
  createSupportChatHandler,
  listUserSupportChatsHandler
} from "../controllers/supportController.js";
import {
  createProductHandler,
  listProductsHandler,
  updateProductHandler,
  deleteProductHandler
} from "../controllers/checkoutController.js";
import {
  getIntegrationsHandler,
  saveIntegrationsHandler,
  getCheckoutProConfigHandler,
  saveCheckoutProConfigHandler
} from "../controllers/dashboardSettingsController.js";

const router = express.Router();

router.use(requireUserSession);

router.get("/overview", overviewHandler);

router.get("/pay-tags", listPayTagsHandler);
router.post("/pay-tags", validate(createPayTagSchema), createPayTagHandler);
router.patch("/pay-tags/:id/toggle", validate(togglePayTagSchema), togglePayTagHandler);
router.delete("/pay-tags/:id", deletePayTagHandler);

router.get("/payouts", listUserPayoutRequestsHandler);
router.post("/payouts", createPayoutRequestHandler);

router.get("/support-chat", listUserSupportChatsHandler);
router.post("/support-chat", createSupportChatHandler);

router.get("/tokens", listApiKeysHandler);
router.post("/tokens", validate(apiKeyCreateSchema), createApiKeyHandler);

router.get("/clients", listClientInsightsHandler);

router.get("/products", listProductsHandler);
router.post("/products", createProductHandler);
router.patch("/products/:id", updateProductHandler);
router.delete("/products/:id", deleteProductHandler);

router.get("/integrations", getIntegrationsHandler);
router.put("/integrations", saveIntegrationsHandler);

router.get("/checkout-pro", getCheckoutProConfigHandler);
router.put("/checkout-pro", saveCheckoutProConfigHandler);

export default router;
