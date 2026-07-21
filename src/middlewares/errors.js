import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(_req, res) {
  return res.status(404).json({
    ok: false,
    error: "Not Found",
    code: "not_found"
  });
}

export function errorHandler(err, req, res, _next) {
  if (isAppError(err)) {
    const payload = {
      ok: false,
      error: err.message,
      code: err.code || "bad_request"
    };
    if (req?.requestId) {
      payload.requestId = req.requestId;
    }
    return res.status(err.statusCode || 400).json(payload);
  }

  if (err?.type === "entity.too.large") {
    const payload = {
      ok: false,
      error: "Payload muito grande.",
      code: "payload_too_large"
    };
    if (req?.requestId) {
      payload.requestId = req.requestId;
    }
    return res.status(413).json(payload);
  }

  const logPayload = { err };
  if (req?.requestId) {
    logPayload.requestId = req.requestId;
  }
  logger.error(logPayload, "Erro inesperado.");
  const payload = {
    ok: false,
    error: "Erro interno.",
    code: "internal_error"
  };
  if (req?.requestId) {
    payload.requestId = req.requestId;
  }
  return res.status(500).json(payload);
}
