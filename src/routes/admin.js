import express from "express";
import {
  createTagHandler,
  approveUserHandler,
  listTransactions,
  listPermissionsHandler,
  listUsers,
  manageTags,
  rejectUserHandler,
  storageInfoHandler
} from "../controllers/adminController.js";
import { requireAdminSession } from "../middlewares/session.js";
import { validate } from "../middlewares/validate.js";
import {
  adminTagCreateSchema,
  adminUserStatusSchema,
  adminUsersQuerySchema
} from "../schemas/authSchemas.js";
import { listClientInsightsHandler } from "../controllers/dashboardController.js";
import {
  listAllDocumentsHandler,
  downloadAdminDocumentHandler
} from "../controllers/documentsController.js";
import {
  listPayoutRequestsForAdmin,
  releasePayoutRequestHandler,
  markPayoutPaidHandler,
  rejectPayoutRequestHandler
} from "../controllers/payoutController.js";
import {
  listSupportChatsForAdminHandler,
  respondSupportChatHandler
} from "../controllers/supportController.js";

const router = express.Router();

router.get("/transactions", requireAdminSession, listTransactions);
router.get("/users", requireAdminSession, validate(adminUsersQuerySchema, "query"), listUsers);
router.patch(
  "/users/:id/approve",
  requireAdminSession,
  validate(adminUserStatusSchema),
  approveUserHandler
);
router.patch(
  "/users/:id/reject",
  requireAdminSession,
  validate(adminUserStatusSchema),
  rejectUserHandler
);
router.get("/tags", requireAdminSession, manageTags);
router.post("/tags", requireAdminSession, validate(adminTagCreateSchema), createTagHandler);
router.get("/permissions", requireAdminSession, listPermissionsHandler);
router.get("/storage", requireAdminSession, storageInfoHandler);
router.get("/clients", requireAdminSession, listClientInsightsHandler);
router.get("/documents", requireAdminSession, listAllDocumentsHandler);
router.get("/documents/:id/download", requireAdminSession, downloadAdminDocumentHandler);
router.get("/payouts", requireAdminSession, listPayoutRequestsForAdmin);
router.patch("/payouts/:id/release", requireAdminSession, releasePayoutRequestHandler);
router.patch("/payouts/:id/paid", requireAdminSession, markPayoutPaidHandler);
router.patch("/payouts/:id/reject", requireAdminSession, rejectPayoutRequestHandler);
router.get("/support-chats", requireAdminSession, listSupportChatsForAdminHandler);
router.patch("/support-chats/:id/respond", requireAdminSession, respondSupportChatHandler);

export default router;
