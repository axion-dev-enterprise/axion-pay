import { AppError } from "../utils/errors.js";
import {
  createDocumentEntry,
  listDocumentsByUser,
  listAllDocuments,
  getDocumentById,
  resolveDocumentPath
} from "../models/documentStore.js";

export async function uploadDocumentHandler(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError("Arquivo obrigatorio.", 400, "invalid_request");
    }

    const document = createDocumentEntry({
      userId: req.user.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      notes: req.body.notes?.trim() || null
    });

    return res.status(201).json({ ok: true, document });
  } catch (err) {
    return next(err);
  }
}

export function listUserDocumentsHandler(req, res, next) {
  try {
    const documents = listDocumentsByUser(req.user.id);
    return res.json({ ok: true, documents });
  } catch (err) {
    return next(err);
  }
}

export function downloadUserDocumentHandler(req, res, next) {
  try {
    const document = getDocumentById(req.params.id);
    if (!document) {
      throw new AppError("Documento nao encontrado.", 404, "not_found");
    }
    if (document.userId !== req.user.id) {
      throw new AppError("Acesso negado ao documento.", 403, "forbidden");
    }
    const filePath = resolveDocumentPath(document.storedName);
    return res.download(filePath, document.originalName);
  } catch (err) {
    return next(err);
  }
}

export function listAllDocumentsHandler(req, res, next) {
  try {
    const documents = listAllDocuments();
    return res.json({ ok: true, documents });
  } catch (err) {
    return next(err);
  }
}

export function downloadAdminDocumentHandler(req, res, next) {
  try {
    const document = getDocumentById(req.params.id);
    if (!document) {
      throw new AppError("Documento nao encontrado.", 404, "not_found");
    }
    const filePath = resolveDocumentPath(document.storedName);
    return res.download(filePath, document.originalName);
  } catch (err) {
    return next(err);
  }
}
