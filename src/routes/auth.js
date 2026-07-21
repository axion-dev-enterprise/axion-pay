import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { requireUserSession } from "../middlewares/session.js";
import {
  loginHandler,
  logoutHandler,
  resendConfirmationHandler
} from "../controllers/authController.js";
import {
  loginSchema,
  resendConfirmationSchema
} from "../schemas/authSchemas.js";

const router = Router();

router.post("/login", validate(loginSchema), loginHandler);
router.post("/logout", requireUserSession, logoutHandler);
router.post("/resend-confirmation", validate(resendConfirmationSchema), resendConfirmationHandler);

export default router;
