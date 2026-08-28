import { describe, it, expect } from "@jest/globals";
import { CryptoOnrampService, SUPPORTED_PROVIDERS } from "../src/services/cryptoOnrampService.js";

describe("CryptoOnrampService", () => {
  it("deve listar os provedores suportados", () => {
    const providers = CryptoOnrampService.getProviders();
    expect(providers.length).toBeGreaterThanOrEqual(4);
    const transak = providers.find(p => p.id === "transak");
    expect(transak).toBeDefined();
    expect(transak.supportsCard).toBe(true);
    expect(transak.supportsPix).toBe(true);
  });

  it("deve calcular cotações agregadas com melhor rota recomendada", async () => {
    const result = await CryptoOnrampService.calculateQuote({
      fiatAmount: 500,
      fiatCurrency: "BRL",
      cryptoCurrency: "USDC",
      network: "polygon",
      paymentMethod: "credit_debit_card"
    });

    expect(result).toBeDefined();
    expect(result.fiatAmount).toBe(500);
    expect(result.allQuotes.length).toBeGreaterThan(0);
    expect(result.bestQuote).toBeDefined();
    expect(result.bestQuote.recommended).toBe(true);
    expect(result.bestQuote.cryptoAmount).toBeGreaterThan(0);
  });

  it("deve criar uma sessão de on-ramp e gerar URL de checkout válida", () => {
    const session = CryptoOnrampService.createSession({
      provider: "transak",
      fiatAmount: 250,
      fiatCurrency: "BRL",
      cryptoCurrency: "USDC",
      network: "polygon",
      walletAddress: "0x71C8F3b3E2FA1B63E2eF7B4a5Bc9E703630A582e",
      tenantId: "tenant_axion_test",
      customerEmail: "cliente@axionenterprise.cloud",
      customerName: "Investidor Axion"
    });

    expect(session).toBeDefined();
    expect(session.orderId).toBeDefined();
    expect(session.checkoutUrl).toContain("transak.com");
    expect(session.checkoutUrl).toContain("cryptoCurrencyCode=USDC");
    expect(session.checkoutUrl).toContain("walletAddress=0x71C8F3b3E2FA1B63E2eF7B4a5Bc9E703630A582e");
    expect(session.status).toBe("pending_payment");
  });

  it("deve processar webhooks de liquidação com sucesso", () => {
    const webhookResult = CryptoOnrampService.processWebhook({
      provider: "transak",
      payload: {
        partnerOrderId: "AXION_TEST_001",
        status: "COMPLETED",
        cryptoAmount: 45.82,
        transactionHash: "0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef"
      },
      signature: "test_signature"
    });

    expect(webhookResult.success).toBe(true);
    expect(webhookResult.orderId).toBe("AXION_TEST_001");
    expect(webhookResult.status).toBe("COMPLETED");
    expect(webhookResult.cryptoAmount).toBe(45.82);
  });
});
