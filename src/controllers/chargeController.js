import { createPayment } from "../services/paymentService.js";
import { logger } from "../utils/logger.js";

export async function chargeHandler(req, res) {
  try {
    const { amount, description = "Cobrança AxionPay" } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ ok: false, error: "Valor inválido." });
    }
    const tx = await createPayment({
      amount: Math.round(amount),
      description,
      method: "pix",
      metadata: {
        provider: "mock",
        operation_mode: "test"
      }
    });
    const pix = tx?.metadata?.pix || {};
    const pixPayload = pix.copia_colar || pix.qrcode || pix.qr_code || pix.qrCode || pix.payload || "";
    const qrCode = pix.qr_code_base64 || pix.qrcode_base64 || pix.base64 || null;
    const paymentUrl = pix.ticket_url || pix.ticketUrl || null;
    res.json({
      ok: true,
      transactionId: tx.id,
      amount: tx.amount,
      status: tx.status,
      paymentUrl,
      qrCode,
      pixPayload
    });
  } catch (err) {
    logger.error({ err }, "Charge error");
    res.status(500).json({ ok: false, error: "Erro ao gerar cobrança.", details: err.message });
  }
}
