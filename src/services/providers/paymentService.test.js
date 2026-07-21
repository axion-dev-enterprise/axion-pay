import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// 1. Definir mocks usando unstable_mockModule para suporte a ESM
jest.unstable_mockModule('../../models/transactionStore.js', () => ({
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  getTransaction: jest.fn(),
  listTransactions: jest.fn(),
  findTransactionByProviderReference: jest.fn(),
  getTransactionEvents: jest.fn(),
  appendEvent: jest.fn(),
  mergeTransactionMetadata: jest.fn(),
  setIdempotencyKey: jest.fn(),
  getTransactionByIdempotencyKey: jest.fn()
}));

jest.unstable_mockModule('./infiniteProvider.js', () => ({
  createCardTransactionWithInfinite: jest.fn()
}));

jest.unstable_mockModule('./cardProviderMock.js', () => ({
  createCardTransactionWithMock: jest.fn()
}));

jest.unstable_mockModule('./wooviProvider.js', () => ({
  createCardTransactionWithWoovi: jest.fn()
}));

jest.unstable_mockModule('./pixProviderMock.js', () => ({
  createPixCharge: jest.fn(),
  confirmPixPayment: jest.fn()
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/idGenerator.js', () => ({
  generateTransactionId: () => 'tx-mock-123',
}));

// Mocks de utilitarios para isolamento total
jest.unstable_mockModule('../../utils/redact.js', () => ({
  redactSensitiveFields: jest.fn((x) => x)
}));
jest.unstable_mockModule('../../utils/validation.js', () => ({
  buildCardSummary: jest.fn(() => ({ summary: 'mock' })),
  normalizeMetadata: jest.fn((x) => x)
}));
jest.unstable_mockModule('../../utils/errors.js', () => ({
  AppError: class extends Error {}
}));

// 2. Importar modulos dinamicamente apos os mocks
const { createPayment } = await import("../paymentService.js");
const transactionStore = await import("../../models/transactionStore.js");
const infiniteProvider = await import("./infiniteProvider.js");
const cardMockProvider = await import("./cardProviderMock.js");

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('deve criar uma transação de cartão usando InfinitePay', async () => {
      // Arrange
      const input = {
        amount_cents: 5000,
        method: 'card',
        customer: {
          name: 'Cliente Teste',
          email: 'cliente@teste.com',
          document: '12345678900'
        },
        metadata: { order_id: '123' }
      };

      const mockTx = {
        id: 'tx-mock-123',
        amount_cents: 5000,
        status: 'pending',
        metadata: { transactionId: 'tx-mock-123' }
      };

      // Mock do store para retornar a transação criada
      transactionStore.createTransaction.mockReturnValue(mockTx);
      
      const mockProviderResponse = {
        success: true,
        status: 'authorized',
        provider: 'mock',
        providerReference: 'mock-card-tx-mock-123',
        raw: { provider: 'mock' }
      };
      cardMockProvider.createCardTransactionWithMock.mockResolvedValue(mockProviderResponse);
      // garantir que o provedor InfinitePay nao foi invocado
      infiniteProvider.createCardTransactionWithInfinite.mockResolvedValue(undefined);

      // Mock do updateTransaction
      transactionStore.updateTransaction.mockImplementation((id, data) => ({
        ...mockTx,
        ...data
      }));

      // Act
      const result = await createPayment(input);

      // Assert
      // 1. Verifica se tentou criar no banco
      expect(transactionStore.createTransaction).toHaveBeenCalled();
      
      // 2. Verifica se chamou o provedor mock com os dados certos
      expect(cardMockProvider.createCardTransactionWithMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount_cents: 5000,
          metadata: expect.objectContaining({ transactionId: 'tx-mock-123' })
        })
      );
      expect(infiniteProvider.createCardTransactionWithInfinite).not.toHaveBeenCalled();
      
      // 3. Verifica se atualizou a transacao com o provider 'infinity'
      expect(transactionStore.updateTransaction).toHaveBeenCalledWith('tx-mock-123', expect.objectContaining({
        provider: 'mock',
        providerReference: 'mock-card-tx-mock-123'
      }));

      expect(result.provider).toBe('mock');
    });
  });
});
