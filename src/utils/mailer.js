import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

let transporter = null;

function resolveOutboxPath() {
  const outbox = config.email.outboxPath || "logs/email-outbox.jsonl";
  return path.resolve(process.cwd(), outbox);
}

function writeOutbox(entry) {
  const outboxPath = resolveOutboxPath();
  fs.mkdirSync(path.dirname(outboxPath), { recursive: true });
  fs.appendFileSync(outboxPath, `${JSON.stringify(entry)}\n`, "utf8");
}

function getTransporter() {
  if (transporter) return transporter;
  const { host, port, user, pass, secure } = config.email.smtp;
  if (!host || !port) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: Boolean(secure),
    auth: user ? { user, pass } : undefined
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    writeOutbox({
      timestamp: new Date().toISOString(),
      mode: "outbox",
      to,
      subject,
      text,
      html
    });
    return { queued: true, mode: "outbox" };
  }

  try {
    const info = await transport.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html
    });
    logger.info({ to, subject, messageId: info.messageId }, "Email enviado.");
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error({ err }, "Falha ao enviar email.");
    writeOutbox({
      timestamp: new Date().toISOString(),
      mode: "failed",
      to,
      subject,
      text,
      html,
      error: err?.message || String(err)
    });
    return { sent: false, error: err?.message || String(err) };
  }
}
