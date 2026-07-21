import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { requireUserSession } from "../middlewares/session.js";
import {
  createPayTagHandler,
  listPayTagsHandler,
  togglePayTagHandler,
  deletePayTagHandler
} from "../controllers/payTagsController.js";
import { createPayTagSchema, togglePayTagSchema } from "../schemas/payTagsSchemas.js";

const router = Router();

// Apply session auth middleware to all routes.
router.use(requireUserSession);

router.post("/", validate(createPayTagSchema), createPayTagHandler);
router.get("/", listPayTagsHandler);
router.patch("/:id/toggle", validate(togglePayTagSchema), togglePayTagHandler);
router.delete("/:id", deletePayTagHandler);

export default router;

