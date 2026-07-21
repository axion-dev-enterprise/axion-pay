import { AppError } from "../utils/errors.js";
import { config } from "../config/env.js";
import { computePayoutAmounts } from "../utils/fees.js";
import {
  createPayoutRequest,
  listPayoutRequestsByUser,
  listAllPayoutRequests,
  updatePayoutRequestStatus
} from "../models/payoutStore.js";
import { getUserDefaultPayoutDestination } from "../models/userStore.js";

function getMinAccountAgeMs() {
  return config.payout?.minAccountAgeMs ?? 48 * 60 * 60 * 1000;
}

function hasAccountAge(user) {
  if (!user?.createdAt) {
    return false;
  }
  const created = new Date(user.createdAt).getTime();
  return Date.now() - created >= getMinAccountAgeMs();
}

export function listUserPayoutRequestsHandler(req, res) {
  const userId = req.user.id;
  const requests = listPayoutRequestsByUser(userId);
  return res.json({ ok: true, requests, eligible: hasAccountAge(req.user) });
}

export function createPayoutRequestHandler(req, res, next) {
  try {
    const { amount, method, notes, destination } = req.body || {};
    if (!hasAccountAge(req.user)) {
      throw new AppError("Solicitante deve ter pelo menos 48 horas de conta ativa.", 403, "account_too_new");
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new AppError("Informe um valor maior que zero.", 400, "invalid_amount");
    }
    const normalizedMethod = String(method || "pix").toLowerCase();
    const storedDestination = getUserDefaultPayoutDestination(req.user.id);
    const normalizedDestination = String(destination || "").trim() || String(storedDestination || "").trim();
    if (normalizedMethod === "pix" && !normalizedDestination) {
      throw new AppError("Informe a chave PIX para receber o repasse.", 400, "missing_pix_destination");
    }
    if (!["pix", "card"].includes(normalizedMethod)) {
      throw new AppError("Metodo invalido.", 400, "invalid_method");
    }
    const calc = computePayoutAmounts({ amount: parsedAmount, method: normalizedMethod, config });
    if (calc.net_cents <= 0) {
      throw new AppError("Valor insuficiente para cobrir taxas.", 400, "insufficient_amount");
    }

    const request = createPayoutRequest({
      userId: req.user.id,
      amount: calc.amount,
      feeTotal: calc.fee_total,
      netAmount: calc.net_amount,
      feeBreakdown: calc.fee_breakdown,
      method: calc.method,
      destination: normalizedDestination || null,
      notes: String(notes || "").trim()
    });
    return res.status(201).json({ ok: true, request });
  } catch (err) {
    return next(err);
  }
}

export function listPayoutRequestsForAdmin(req, res) {
  const requests = listAllPayoutRequests();
  return res.json({ ok: true, requests });
}

export function releasePayoutRequestHandler(req, res, next) {
  try {
    const { id } = req.params;
    const timestamp = new Date().toISOString();
    const updates = {
      status: "approved",
      released_at: timestamp,
      approved_at: timestamp
    };
    const updated = updatePayoutRequestStatus(id, updates);
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Solicitacao nao encontrada.", code: "not_found" });
    }
    return res.json({ ok: true, request: updated });
  } catch (err) {
    return next(err);
  }
}

export function markPayoutPaidHandler(req, res, next) {
  try {
    const { id } = req.params;
    const timestamp = new Date().toISOString();
    const updated = updatePayoutRequestStatus(id, {
      status: "paid",
      paid_at: timestamp
    });
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Solicitacao nao encontrada.", code: "not_found" });
    }
    return res.json({ ok: true, request: updated });
  } catch (err) {
    return next(err);
  }
}

export function rejectPayoutRequestHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    const timestamp = new Date().toISOString();
    const updated = updatePayoutRequestStatus(id, {
      status: "rejected",
      rejected_at: timestamp,
      admin_notes: notes ? String(notes).trim().slice(0, 500) : null
    });
    if (!updated) {
      return res.status(404).json({ ok: false, error: "Solicitacao nao encontrada.", code: "not_found" });
    }
    return res.json({ ok: true, request: updated });
  } catch (err) {
    return next(err);
  }
}
