import express from "express";
import {
  cancelPaymentHandler,
  capturePaymentHandler,
  confirmPixPaymentHandler,
  createCardPaymentHandler,
  createPaymentHandler,
  createPixPaymentHandler,
  getPaymentByProviderReferenceHandler,
  getPaymentEventsHandler,
  getPaymentHandler,
  getPaymentStatsHandler,
  listPaymentsByMethodHandler,
  listPaymentsByStatusHandler,
  listPaymentsHandler,
  refundPaymentHandler,
  updatePaymentMetadataHandler
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/", createPaymentHandler);
router.post("/pix", createPixPaymentHandler);
router.post("/card", createCardPaymentHandler);

router.get("/", listPaymentsHandler);
router.get("/stats", getPaymentStatsHandler);
router.get("/status/:status", listPaymentsByStatusHandler);
router.get("/method/:method", listPaymentsByMethodHandler);
router.get("/provider/:providerReference", getPaymentByProviderReferenceHandler);
router.get("/:id/events", getPaymentEventsHandler);
router.get("/:id", getPaymentHandler);

router.post("/:id/confirm", confirmPixPaymentHandler);
router.post("/:id/capture", capturePaymentHandler);
router.post("/:id/cancel", cancelPaymentHandler);
router.post("/:id/refund", refundPaymentHandler);
router.patch("/:id/metadata", updatePaymentMetadataHandler);

export default router;
