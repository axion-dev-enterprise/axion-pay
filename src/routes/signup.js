import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { signupHandler } from "../controllers/authController.js";
import { signupSchema } from "../schemas/authSchemas.js";

const router = Router();

router.post("/", validate(signupSchema), signupHandler);

export default router;
