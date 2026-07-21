import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { requireUserSession } from "../middlewares/session.js";
import {
  createCardTokenHandler,
  listCardTokensHandler,
  deleteCardTokenHandler
} from "../controllers/cardTokensController.js";
import { cardTokenSchema } from "../schemas/cardTokenSchemas.js";
import { idParamSchema } from "../schemas/paymentSchemas.js";

const router = Router();

router.use(requireUserSession);
router.post("/", validate(cardTokenSchema), createCardTokenHandler);
router.get("/", listCardTokensHandler);
router.delete("/:id", validate(idParamSchema), deleteCardTokenHandler);

export default router;
