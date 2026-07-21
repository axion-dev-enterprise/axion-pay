import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { config } from "../config/env.js";
import {
  uploadDocumentHandler,
  listUserDocumentsHandler,
  downloadUserDocumentHandler
} from "../controllers/documentsController.js";
import { requireUserSession } from "../middlewares/session.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(path.dirname(config.uploadsPath), { recursive: true });
    fs.mkdirSync(config.uploadsPath, { recursive: true });
    cb(null, config.uploadsPath);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${uuid()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.DOCUMENT_MAX_BYTES || "10485760", 10) // 10MB default
  }
});

router.use(requireUserSession);

router.get("/", listUserDocumentsHandler);
router.post("/", upload.single("document"), uploadDocumentHandler);
router.get("/:id/download", downloadUserDocumentHandler);

export default router;
