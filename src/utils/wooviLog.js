import fs from "fs";
import path from "path";
import { redactSensitiveFields } from "./redact.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

const LOG_PATH = config.logging.wooviLogPath;
let logReady = false;

async function ensureLogDir() {
  if (logReady) return;
  const dir = path.dirname(LOG_PATH);
  await fs.promises.mkdir(dir, { recursive: true });
  logReady = true;
}

function appendLine(payload) {
  const line = JSON.stringify(payload);
  ensureLogDir()
    .then(() => fs.promises.appendFile(LOG_PATH, `${line}\n`, "utf8"))
    .catch((err) => logger.warn({ err }, "Falha ao gravar log Woovi."));
}

export function logWooviResponse({
  operation,
  requestId,
  method,
  url,
  status,
  durationMs,
  data
}) {
  appendLine({
    ts: new Date().toISOString(),
    event: "woovi_response",
    operation,
    request_id: requestId || null,
    method,
    url,
    status,
    duration_ms: durationMs,
    response: redactSensitiveFields(data)
  });
}

export function logWooviError({
  operation,
  requestId,
  method,
  url,
  status,
  durationMs,
  error
}) {
  appendLine({
    ts: new Date().toISOString(),
    event: "woovi_error",
    operation,
    request_id: requestId || null,
    method,
    url,
    status: status ?? null,
    duration_ms: durationMs,
    error: redactSensitiveFields(error)
  });
}
