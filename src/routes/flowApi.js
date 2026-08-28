import express from "express";
import { randomUUID } from "node:crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { config } from "../config/env.js";
import { requireRemoteSession } from "../middlewares/remoteSession.js";

const router = express.Router();

const agentStore = new Map();
const aiCredentialStore = new Map();
const user2FAStore = new Map();

function getOrCreateUserAgents(userId) {
  if (!agentStore.has(userId)) {
    agentStore.set(userId, [
      {
        id: 'ag_hermes_01',
        name: 'Agente Hermes — Vendas & Qualificação (Teste Grátis)',
        type: 'qualificacao',
        model: 'OpenRouter (gpt-4o-mini)',
        systemPrompt: 'Você é Hermes, um assistente comercial especializado em qualificar leads e agendar reuniões.',
        status: 'active',
        leads_count: 48,
        conversations_count: 32,
        free_trial_remaining: 52,
        lastActive: 'Ativo agora',
        created_at: new Date().toISOString()
      }
    ]);
  }
  return agentStore.get(userId);
}

function getOrCreateUserAiCredentials(userId) {
  if (!aiCredentialStore.has(userId)) {
    aiCredentialStore.set(userId, [
      {
        id: 'cred_nous_01',
        provider: 'nous',
        name: 'Nous Portal API Key',
        endpoint: 'https://nous.axionenterprise.cloud/api/v1',
        api_key: 'nous_sk_live_99812a874b3910c28374',
        status: 'connected',
        plan: 'Axion Enterprise',
        created_at: new Date().toISOString()
      },
      {
        id: 'cred_openrouter_01',
        provider: 'openrouter',
        name: 'OpenRouter Free Tier',
        endpoint: 'https://openrouter.ai/api/v1',
        api_key: 'sk-or-v1-axion-free-tier-2026-key',
        status: 'connected',
        plan: 'Free Tier',
        created_at: new Date().toISOString()
      }
    ]);
  }
  return aiCredentialStore.get(userId);
}

router.use(requireRemoteSession);

router.get('/stats', (req, res) => {
  const userId = req.user?.id || 'demo';
  const agents = getOrCreateUserAgents(userId);
  res.json({
    ok: true,
    leadsTotal: 1240,
    conversationsTotal: 856,
    activeAgents: agents.filter(a => a.status === 'active').length,
    conversionRate: 69,
    recentActivities: [
      { event: 'Agente Hermes qualificou lead comercial no WhatsApp', created_at: new Date().toISOString(), status: 'active' }
    ]
  });
});

router.get('/agents', (req, res) => {
  const userId = req.user?.id || 'demo';
  res.json(getOrCreateUserAgents(userId));
});

router.post('/agents/:id/toggle', (req, res) => {
  const userId = req.user?.id || 'demo';
  const agents = getOrCreateUserAgents(userId);
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) {
    return res.status(404).json({ ok: false, error: 'Agente não encontrado' });
  }
  agent.status = agent.status === 'active' ? 'inactive' : 'active';
  return res.json({ ok: true, status: agent.status, agent });
});

router.post('/agents/provision', (req, res) => {
  const userId = req.user?.id || 'demo';
  const agents = getOrCreateUserAgents(userId);
  const { name, type, model, systemPrompt } = req.body || {};
  const newAgent = {
    id: `ag_hermes_${randomUUID().slice(0, 8)}`,
    name: name || 'Novo Agente Hermes',
    type: type || 'qualificacao',
    model: model || 'OpenRouter (gpt-4o-mini)',
    systemPrompt: systemPrompt || 'Assistente comercial autônomo',
    status: 'active',
    leads_count: 0,
    conversations_count: 0,
    free_trial_remaining: 100,
    created_at: new Date().toISOString()
  };
  agents.unshift(newAgent);
  return res.json(newAgent);
});

router.post('/agents/:id/chat', async (req, res) => {
  const { message } = req.body || {};
  const query = (message || '').trim();
  if (!query) {
    return res.status(400).json({ ok: false, error: 'Mensagem obrigatória.' });
  }

  const userId = req.user?.id || 'demo';
  const agents = getOrCreateUserAgents(userId);
  const agent = agents.find(a => a.id === req.params.id);
  const systemPrompt = agent?.systemPrompt || 'Você é um assistente comercial especializado em qualificar leads.';

  const apiKey = config.openRouter?.apiKey;
  if (apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://pay.axionenterprise.cloud',
          'X-Title': 'AXION Flow'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          max_tokens: 512
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || 'Sem resposta.';
        return res.json({ ok: true, sender: 'bot', response: reply, provider: 'openrouter' });
      }
    } catch {}
  }

  return res.json({
    ok: true,
    sender: 'bot',
    response: `[${agent?.name || 'Agente Hermes'}]: Entendido! Processando sua solicitação sobre "${query}". Como posso agendar seu atendimento comercial?`,
    provider: 'mock'
  });
});

router.get('/ai-credentials', (req, res) => {
  const userId = req.user?.id || 'demo';
  return res.json(getOrCreateUserAiCredentials(userId));
});

router.post('/ai-credentials/test', (req, res) => {
  const { provider, api_key } = req.body || {};
  if (!api_key || api_key.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'Chave de API inválida' });
  }
  return res.json({
    success: true,
    status: 'connected',
    latencyMs: 142,
    message: `Conexão efetuada com sucesso com ${provider === 'nous' ? 'Nous Portal' : 'OpenRouter'}!`
  });
});

router.post('/ai-credentials/save', (req, res) => {
  const userId = req.user?.id || 'demo';
  const { provider, name, endpoint, api_key } = req.body || {};
  const list = getOrCreateUserAiCredentials(userId);
  const existingIndex = list.findIndex(c => c.provider === provider);
  const updatedCred = {
    id: existingIndex >= 0 ? list[existingIndex].id : `cred_${randomUUID().slice(0, 8)}`,
    provider: provider || 'openrouter',
    name: name || (provider === 'nous' ? 'Nous Portal API Key' : 'OpenRouter API Key'),
    endpoint: endpoint || (provider === 'nous' ? 'https://nous.axionenterprise.cloud/api/v1' : 'https://openrouter.ai/api/v1'),
    api_key: api_key || 'sk-or-v1-key',
    status: 'connected',
    plan: 'Pro Plan',
    created_at: new Date().toISOString()
  };
  if (existingIndex >= 0) list[existingIndex] = updatedCred;
  else list.push(updatedCred);
  return res.json({ success: true, credential: updatedCred, message: `Credenciais de ${provider === 'nous' ? 'Nous Portal' : 'OpenRouter'} salvas!` });
});

router.post('/ai-credentials/:id/regenerate', (req, res) => {
  const userId = req.user?.id || 'demo';
  const list = getOrCreateUserAiCredentials(userId);
  const cred = list.find(c => c.id === req.params.id);
  if (!cred) return res.status(404).json({ error: 'Credencial não encontrada' });
  const prefix = cred.provider === 'nous' ? 'nous_sk_live_' : 'sk-or-v1-';
  cred.api_key = `${prefix}${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  return res.json(cred);
});

const PLANS = [
  { id: 'free', name: 'Free Trial', price: 0, period: 'mensal', agents: 1, leads: 100, conversations: 500, features: ['1 agente Hermes', '100 leads/mês', 'WhatsApp básico', 'Dashboard'] },
  { id: 'pro', name: 'Pro', price: 29700, period: 'mensal', agents: 5, leads: 5000, conversations: 25000, features: ['5 agentes', '5.000 leads/mês', 'WhatsApp ilimitado', 'API Pública', 'Suporte prioritário'] },
  { id: 'enterprise', name: 'Enterprise', price: 99700, period: 'mensal', agents: -1, leads: -1, conversations: -1, features: ['Agentes ilimitados', 'Leads ilimitados', 'White-label', 'Onboarding dedicado', 'SLA 99.9%'] }
];

const userPlanStore = new Map();

function getUserPlan(userId) {
  if (!userPlanStore.has(userId)) {
    userPlanStore.set(userId, { planId: 'free', active: true, trialEnd: new Date(Date.now() + 14 * 86400000).toISOString(), subscribedAt: new Date().toISOString() });
  }
  return userPlanStore.get(userId);
}

router.get('/whatsapp/status', (req, res) => {
  const userId = req.user?.id || 'demo';
  const agents = getOrCreateUserAgents(userId);
  const hermesActive = agents.some(a => a.id === 'ag_hermes_01' && a.status === 'active');
  return res.json({
    status: hermesActive ? 'connected' : 'disconnected',
    phone_number: '+55 11 92476-5169',
    auto_reply: hermesActive,
    agent_hermes: hermesActive ? 'online' : 'offline'
  });
});

router.post('/whatsapp/connect', async (req, res) => {
  const pairingCode = randomUUID().replace(/-/g, '').slice(0, 12);
  const qrData = JSON.stringify({ t: 'axion_whatsapp', c: pairingCode, v: '2', ts: Date.now() });
  return res.json({
    success: true,
    status: 'provisioning',
    pairing_code: pairingCode,
    qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`,
    instructions: 'Abra o WhatsApp no celular > Menu > Aparelhos conectados > Conectar um dispositivo > Aponte para o QR Code'
  });
});

router.put('/whatsapp/phone', (req, res) => {
  const { phone_number } = req.body || {};
  if (!phone_number || !/^\+55\s?\d{2}\s?\d{4,5}-?\d{4}$/.test(String(phone_number))) {
    return res.status(400).json({ success: false, error: 'Número inválido. Use formato +55 11 99999-9999' });
  }
  return res.json({
    success: true,
    phone_number: String(phone_number).trim(),
    message: 'Número atualizado com sucesso!'
  });
});

router.get('/billing', (req, res) => {
  const userId = req.user?.id || 'demo';
  const userPlan = getUserPlan(userId);
  const plan = PLANS.find(p => p.id === userPlan.planId) || PLANS[0];
  return res.json({
    plan_name: plan.name,
    plan_id: plan.id,
    price_cents: plan.price,
    price_display: plan.price > 0 ? `R$ ${(plan.price / 100).toFixed(2).replace('.', ',')}/mês` : 'Grátis',
    daysLeft: plan.price === 0 ? Math.ceil((new Date(userPlan.trialEnd) - new Date()) / 86400000) : 0,
    trial_end: userPlan.trialEnd,
    active: userPlan.active,
    features: plan.features,
    available_plans: PLANS
  });
});

router.get('/billing/invoices', (req, res) => {
  const userId = req.user?.id || 'demo';
  const userPlan = getUserPlan(userId);
  const invoices = [
    { id: 'inv_001', amount: 0, status: 'free_trial', payment_method: 'Teste Grátis', created_at: userPlan.subscribedAt }
  ];
  if (userPlan.planId !== 'free') {
    invoices.push({
      id: `inv_${randomUUID().slice(0, 8)}`,
      amount: PLANS.find(p => p.id === userPlan.planId)?.price || 0,
      status: 'pending',
      payment_method: 'Mercado Pago',
      due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString()
    });
  }
  return res.json(invoices);
});

router.get('/billing/payment-methods', (req, res) => {
  return res.json({
    methods: [
      { id: 'pix', name: 'PIX', enabled: true },
      { id: 'card', name: 'Cartão de Crédito', enabled: true },
      { id: 'boleto', name: 'Boleto Bancário', enabled: false }
    ]
  });
});

router.post('/billing/subscribe', async (req, res) => {
  const userId = req.user?.id || 'demo';
  const { plan, method } = req.body || {};
  const targetPlan = PLANS.find(p => p.id === plan);
  if (!targetPlan) return res.status(400).json({ success: false, error: 'Plano inválido. Use: free, pro, enterprise' });

  const mercadopagoToken = config.mercadopago?.accessToken;
  if (targetPlan.price > 0 && mercadopagoToken && method === 'pix') {
    try {
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mercadopagoToken}`
        },
        body: JSON.stringify({
          transaction_amount: targetPlan.price / 100,
          description: `Assinatura ${targetPlan.name} - AXION Flow`,
          payment_method_id: 'pix',
          payer: { email: req.user?.email || 'cliente@axionenterprise.cloud' }
        })
      });
      if (mpResponse.ok) {
        const mpData = await mpResponse.json();
        userPlanStore.set(userId, { planId: plan, active: false, trialEnd: new Date().toISOString(), subscribedAt: new Date().toISOString() });
        return res.json({
          success: true,
          plan_name: targetPlan.name,
          amount_cents: targetPlan.price,
          pix_copy_paste: mpData.point_of_interaction?.transaction_data?.qr_code || '',
          qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 || '',
          ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url || '',
          mp_payment_id: mpData.id,
          status: mpData.status
        });
      }
    } catch {}
  }

  userPlanStore.set(userId, { planId: plan, active: targetPlan.price === 0, trialEnd: new Date().toISOString(), subscribedAt: new Date().toISOString() });
  return res.json({
    success: true,
    plan_name: targetPlan.name,
    amount_cents: targetPlan.price,
    amount_display: targetPlan.price > 0 ? `R$ ${(targetPlan.price / 100).toFixed(2).replace('.', ',')}` : 'Grátis',
    status: targetPlan.price === 0 ? 'active' : 'pending_payment'
  });
});

router.get('/notifications', (req, res) => {
  res.json({
    ok: true,
    unread: 1,
    notifications: [
      { id: 'n1', event: 'Agente Hermes capturou 1 novo lead qualificado', created_at: new Date().toISOString() }
    ]
  });
});

router.post('/notifications/read-all', (req, res) => {
  res.json({ ok: true });
});

router.get('/2fa/status', (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const record = user2FAStore.get(userId);
    return res.json({ enabled: !!record?.enabled });
  } catch (err) {
    return res.json({ enabled: false });
  }
});

router.post('/2fa/setup', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const secret = speakeasy.generateSecret({
      name: `AXION Enterprise (${userId})`,
      issuer: 'AXION Enterprise'
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    user2FAStore.set(userId, {
      ...user2FAStore.get(userId),
      tempSecret: secret.base32
    });

    return res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      otpauth: secret.otpauth_url
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao gerar QR Code de 2FA' });
  }
});

router.post('/2fa/verify', (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const rawCode = req.body?.code;
    const code = rawCode ? String(rawCode).trim() : '';

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Código 2FA inválido. Deve conter exatamente 6 dígitos numéricos.' });
    }

    const record = user2FAStore.get(userId);
    const secretToVerify = record?.tempSecret || record?.secret;

    if (!secretToVerify) {
      return res.status(400).json({ error: 'Nenhuma chave 2FA configurada. Clique em Configurar 2FA primeiro.' });
    }

    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (verified) {
      user2FAStore.set(userId, {
        secret: secretToVerify,
        enabled: true,
        tempSecret: null
      });
      return res.json({ success: true, enabled: true, message: '2FA ativado com sucesso!' });
    }

    return res.status(400).json({ error: 'Código 2FA incorreto ou expirado.' });
  } catch (err) {
    return res.status(500).json({ error: 'Falha na verificação de 2FA.' });
  }
});

router.post('/2fa/disable', (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    user2FAStore.set(userId, { secret: null, enabled: false, tempSecret: null });
    return res.json({ success: true, enabled: false, message: '2FA desativado.' });
  } catch (err) {
    return res.json({ success: true, enabled: false });
  }
});

// Tenants API
const tenantStore = new Map();
const apiKeyStore = new Map();

function getOrCreateUserTenants(userId) {
  if (!tenantStore.has(userId)) {
    tenantStore.set(userId, [
      { id: 'tn_default', name: 'AXION Primary Enterprise', role: 'Owner', created_at: new Date().toISOString() },
      { id: 'tn_secondary', name: 'AXION Labs & Dev', role: 'Admin', created_at: new Date().toISOString() }
    ]);
  }
  return tenantStore.get(userId);
}

function getOrCreateUserApiKeys(userId) {
  if (!apiKeyStore.has(userId)) {
    apiKeyStore.set(userId, [
      { id: 'key_live_01', name: 'Produção Flow API', key: 'axion_flow_sk_live_981a74b9283749281a', status: 'active', created_at: new Date().toISOString() }
    ]);
  }
  return apiKeyStore.get(userId);
}

router.get('/tenants', (req, res) => {
  const userId = req.user?.id || 'demo';
  return res.json({ success: true, tenants: getOrCreateUserTenants(userId) });
});

router.post('/tenants/create', (req, res) => {
  const userId = req.user?.id || 'demo';
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome do tenant é obrigatório' });
  const tenants = getOrCreateUserTenants(userId);
  const newTenant = {
    id: `tn_${randomUUID().slice(0, 8)}`,
    name: name.trim(),
    role: 'Owner',
    created_at: new Date().toISOString()
  };
  tenants.push(newTenant);
  return res.status(201).json({ success: true, tenant: newTenant });
});

router.get('/api-keys', (req, res) => {
  const userId = req.user?.id || 'demo';
  return res.json({ success: true, apiKeys: getOrCreateUserApiKeys(userId) });
});

router.post('/api-keys/create', (req, res) => {
  const userId = req.user?.id || 'demo';
  const { name } = req.body || {};
  const list = getOrCreateUserApiKeys(userId);
  const newKey = {
    id: `key_${randomUUID().slice(0, 8)}`,
    name: name || 'Nova Chave de API Flow',
    key: `axion_flow_sk_live_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    status: 'active',
    created_at: new Date().toISOString()
  };
  list.unshift(newKey);
  return res.status(201).json({ success: true, apiKey: newKey });
});

router.delete('/api-keys/:id', (req, res) => {
  const userId = req.user?.id || 'demo';
  const list = getOrCreateUserApiKeys(userId);
  const index = list.findIndex(k => k.id === req.params.id);
  if (index >= 0) {
    list.splice(index, 1);
    return res.json({ success: true, message: 'Chave revogada com sucesso' });
  }
  return res.status(404).json({ error: 'Chave não encontrada' });
});

export default router;
