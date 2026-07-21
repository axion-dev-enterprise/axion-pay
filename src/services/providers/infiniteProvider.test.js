import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock do fetch global deve existir antes do import
global.fetch = jest.fn();

// 1. Definir mocks antes dos imports (ESM)
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// 2. Importar o modulo sob teste dinamicamente
const { createCardTransactionWithInfinite } = await import("./infiniteProvider.js");

describe("InfiniteProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve enviar o payload correto para a API da InfinitePay", async () => {
    // Arrange: Simula resposta de sucesso da API
    const mockResponseData = { id: "link-123", url: "https://pay.infinite.io/123" };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
      status: 201
    });

    const input = {
      amount_cents: 25000,
      customer: {
        name: "João Silva",
        email: "joao@email.com",
        document: "11122233344",
        whatsapp: "+55 (11) 98888-7777"
      },
      metadata: {
        pay_tag: "anne-tom",
        transactionId: "tx-abc-123"
      }
    };

    // Act
    const result = await createCardTransactionWithInfinite(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.providerReference).toBe("link-123");

    // Verifica se a URL e Headers estao corretos
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.infinitepay.io/invoices/public/checkout/links",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );

    // Verifica o corpo da requisicao (Payload)
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.handle).toBe("annetom");
    expect(callBody.order_nsu).toBe("tx-abc-123");
    expect(callBody.items[0].price).toBe(25000);
    expect(callBody.customer.name).toBe("João Silva");
    expect(callBody.customer.phone_number).toBe("5511988887777");
    expect(callBody.redirect_url).toBe("https://annetom.com/payconfirmed");
  });

  it("deve retornar erro se faltar telefone do cliente", async () => {
    const result = await createCardTransactionWithInfinite({
      amount_cents: 1000,
      customer: { name: "Cliente", email: "c@t.com" },
      metadata: { pay_tag: "anne-tom", transactionId: "tx-no-phone" }
    });

    expect(result.success).toBe(false);
    expect(String(result.error || "")).toContain("customer.phone_number");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deve retornar erro se a API falhar", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid data" })
    });

    const result = await createCardTransactionWithInfinite({
      amount_cents: 1000,
      customer: { whatsapp: "+55 (11) 90000-0000" },
      metadata: { pay_tag: "anne-tom", transactionId: "tx-err" }
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid data");
  });
});

