import express from "express";
import { getProductBySlugHandler } from "../controllers/checkoutController.js";
import { createCheckoutPaymentHandler } from "../controllers/publicCheckoutPaymentController.js";

const router = express.Router();

router.get("/products/:slug", getProductBySlugHandler);
router.post("/products/:slug/payments/:method", createCheckoutPaymentHandler);

export default router;
