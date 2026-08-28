import express from 'express';
import { randomUUID } from 'node:crypto';

const router = express.Router();
const subscriptionStore = new Map();

// GET /api/subscriptions — Listar assinaturas ativas do merchant
router.get('/', (req, res) => {
  const tenantId = req.tenantId || 'default';
  const list = Array.from(subscriptionStore.values()).filter(s => s.tenantId === tenantId);
  res.json({
    ok: true,
    total: list.length,
    subscriptions: list
  });
});

// POST /api/subscriptions — Criar nova assinatura recorrente
router.post('/', (req, res) => {
  const { plan_name, amount_cents, interval, card, customer } = req.body || {};
  if (!amount_cents || amount_cents <= 0) {
    return res.status(400).json({ ok: false, error: 'Valor em centavos (amount_cents) inválido.' });
  }

  if (!card || !card.number) {
    return res.status(400).json({ ok: false, error: 'Cartão de crédito é obrigatório para cadastrar assinatura.' });
  }

  const subId = `sub_${randomUUID().slice(0, 12)}`;
  const subscription = {
    id: subId,
    tenantId: req.tenantId || 'default',
    plan_name: plan_name || 'Plano Pro',
    amount_cents,
    interval: interval || 'monthly',
    status: 'active',
    customer: customer || { email: 'dev@axionenterprise.cloud' },
    card_summary: {
      brand: 'visa',
      last4: String(card.number).slice(-4),
      exp_month: card.exp_month,
      exp_year: card.exp_year
    },
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString()
  };

  subscriptionStore.set(subId, subscription);

  return res.status(201).json({
    ok: true,
    message: 'Assinatura criada e ativada com sucesso.',
    subscription
  });
});

// POST /api/subscriptions/:id/cancel — Cancelar assinatura
router.post('/:id/cancel', (req, res) => {
  const sub = subscriptionStore.get(req.params.id);
  if (!sub) {
    return res.status(404).json({ ok: false, error: 'Assinatura não encontrada.' });
  }

  sub.status = 'canceled';
  sub.canceled_at = new Date().toISOString();
  return res.json({ ok: true, message: 'Assinatura cancelada com sucesso.', subscription: sub });
});

export default router;
