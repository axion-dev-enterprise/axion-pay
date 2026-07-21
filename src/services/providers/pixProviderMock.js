import { generatePixPayload } from '../../utils/pixPayload.js';

// Dados fixos para simulação
const MOCK_PIX_KEY = '38209847805';
const MOCK_MERCHANT_NAME = 'AXIONPAY';
const MOCK_MERCHANT_CITY = 'SAO PAULO';

export async function createPixCharge({ amount_cents, amount, currency, customer, metadata }) {
  // Valor em reais, se não vier, converte de cents
  const value = amount || (amount_cents ? (amount_cents / 100).toFixed(2) : '1.00');
  const txid = metadata?.transactionId || 'MOCKTXID123';
  const description = 'Pagamento Axion';
  const qrcode = generatePixPayload({
    pixKey: MOCK_PIX_KEY,
    merchantName: MOCK_MERCHANT_NAME,
    merchantCity: MOCK_MERCHANT_CITY,
    amount: value,
    txid,
    description
  });
  return {
    success: true,
    status: 'pending',
    provider: 'pix-local',
    providerReference: 'pix-' + Date.now(),
    raw: { qrcode, copia_colar: qrcode }
  };
}

export async function confirmPixPayment(ref) {
  return {
    success: true,
    status: 'paid',
    raw: { confirmed_at: new Date() }
  };
}
