import express from "express";
import { CryptoOnrampService } from "../services/cryptoOnrampService.js";

const router = express.Router();

/**
 * GET /api/v1/onramp/providers
 * Lista provedores suportados e status de integração
 */
router.get("/providers", (req, res) => {
  try {
    const providers = CryptoOnrampService.getProviders();
    res.json({
      success: true,
      count: providers.length,
      data: providers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/onramp/quote
 * Cotação agregada multi-provedor com menor taxa e melhor rota
 */
router.post("/quote", async (req, res) => {
  try {
    const { fiatAmount, fiatCurrency, cryptoCurrency, network, paymentMethod } = req.body;
    
    if (!fiatAmount || Number(fiatAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Parâmetro 'fiatAmount' obrigatório e deve ser maior que 0."
      });
    }

    const quoteData = await CryptoOnrampService.calculateQuote({
      fiatAmount,
      fiatCurrency,
      cryptoCurrency,
      network,
      paymentMethod
    });

    res.json({
      success: true,
      data: quoteData
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/onramp/session
 * Inicializa sessão de checkout On-Ramp e gera URL segura
 */
router.post("/session", (req, res) => {
  try {
    const {
      provider,
      fiatAmount,
      fiatCurrency,
      cryptoCurrency,
      network,
      walletAddress,
      partnerOrderId,
      customerEmail,
      customerName,
      redirectUrl
    } = req.body;

    const tenantId = req.tenantId || req.headers["x-tenant-id"] || "default";

    if (!fiatAmount || Number(fiatAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Parâmetro 'fiatAmount' obrigatório e deve ser maior que 0."
      });
    }

    const session = CryptoOnrampService.createSession({
      provider,
      fiatAmount,
      fiatCurrency,
      cryptoCurrency,
      network,
      walletAddress,
      tenantId,
      partnerOrderId,
      customerEmail,
      customerName,
      redirectUrl
    });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/onramp/webhook
 * Recebe e processa confirmações de liquidação on-chain dos provedores
 */
router.post("/webhook", (req, res) => {
  try {
    const provider = req.query.provider || req.headers["x-provider"] || "transak";
    const signature = req.headers["x-signature"] || req.headers["x-transak-signature"] || "";
    const payload = req.body;

    const result = CryptoOnrampService.processWebhook({
      provider,
      payload,
      signature
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
