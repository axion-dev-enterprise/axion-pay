import { logger } from "../../utils/logger.js";
import { generatePixPayload } from "../../utils/pixPayload.js";

/**
 * Provider para PIX Estático do Banco Central
 * Gera QR Code estático para pagamentos PIX
 */
export async function createPixTransactionWithBancoCentral({
  amount,
  amount_cents,
  customer,
  metadata
}) {
  const pixKey = process.env.BC_PIX_KEY || "2e902cce-70ff-43d9-818c-2b41983b2f6c";
  const merchantName = process.env.BC_MERCHANT_NAME || "";
  const merchantCity = process.env.BC_MERCHANT_CITY || "";
  const merchantCode = process.env.BC_MERCHANT_CODE || "";

  if (!pixKey) {
    logger.warn("Chave PIX do Banco Central não configurada. Usando modo mock.");
    const ref = "BCPIXMOCK-" + Date.now();
    return {
      success: true,
      status: "pending",
      providerReference: ref,
      raw: {
        qr_code: "mock_bc_qr_code",
        qr_code_base64: "mock_bc_base64",
        pix_key: pixKey || "mock_key",
        merchant_name: merchantName || "Mock Merchant",
        merchant_city: merchantCity || "Mock City"
      }
    };
  }

  try {
    const amountCents = Number.isInteger(amount_cents) ? amount_cents : Math.round(amount * 100);
    const amountFloat = amountCents / 100;

    // Construir payload para QR Code estático do BC
    const payload = {
      chave: pixKey,
      nome: merchantName,
      cidade: merchantCity,
      valor: amountFloat.toFixed(2),
      tid: metadata?.transactionId || String(Date.now()),
      info: metadata?.description || `Pagamento ${metadata?.transactionId || Date.now()}`
    };

    // Simular geração do QR Code (em produção, integrar com API do BC ou biblioteca PIX)
    const qrCodeData = generateStaticPixQRCode(payload);

    const pixKeyMasked = pixKey ? `${pixKey.slice(0, 4)}...${pixKey.slice(-6)}` : "";
    logger.info({ amountCents, pixKey: pixKeyMasked }, "Gerando QR Code PIX Estático Banco Central");

    return {
      success: true,
      status: "pending",
      providerReference: `BCPIX-${Date.now()}`,
      raw: {
        qr_code: qrCodeData.qr_code,
        qr_code_base64: qrCodeData.qr_code_base64,
        pix_key: pixKey,
        merchant_name: merchantName,
        merchant_city: merchantCity,
        merchant_code: merchantCode,
        amount: amountFloat.toFixed(2),
        transaction_id: payload.tid
      }
    };
  } catch (error) {
    logger.error({ error }, "Erro ao gerar QR Code PIX Estático Banco Central");
    return {
      success: false,
      status: "failed",
      error: error.message,
      providerReference: null,
      raw: null
    };
  }
}

/**
 * Gera dados do QR Code estático PIX (simulação)
 * Em produção, usar biblioteca como 'pix-qrcode' ou API do BC
 */
function generateStaticPixQRCode(payload) {
  const merchantName = payload?.nome ? String(payload.nome) : "";
  const merchantCity = payload?.cidade ? String(payload.cidade) : "";

  // BR Code exige nome e cidade; se nao estiverem configurados, usa defaults previsiveis.
  // (Melhor: configurar BC_MERCHANT_NAME/BC_MERCHANT_CITY no ambiente.)
  const safeMerchantName = merchantName.trim() || "AXIONPAY";
  const safeMerchantCity = merchantCity.trim() || "SAO PAULO";
  if (!merchantName.trim() || !merchantCity.trim()) {
    logger.warn(
      { hasMerchantName: Boolean(merchantName.trim()), hasMerchantCity: Boolean(merchantCity.trim()) },
      "Banco Central PIX: merchant name/city ausentes; gerando BR Code com defaults"
    );
  }

  const pixPayload = generatePixPayload({
    pixKey: String(payload?.chave || "").trim(),
    merchantName: safeMerchantName,
    merchantCity: safeMerchantCity,
    amount: payload?.valor ? String(payload.valor) : "",
    txid: payload?.tid ? String(payload.tid) : "***",
    description: payload?.info ? String(payload.info) : ""
  });

  // Simulação - em produção usar biblioteca real
  return {
    qr_code: pixPayload,
    qr_code_base64: Buffer.from(pixPayload).toString('base64')
  };
}
