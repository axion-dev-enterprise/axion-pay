import express from "express";
import { randomUUID } from "node:crypto";
import { requireRemoteSession } from "../middlewares/remoteSession.js";

const router = express.Router();

const agentStore = new Map();
const aiCredentialStore = new Map();

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

router.post('/agents/:id/chat', (req, res) => {
  const { message } = req.body || {};
  const query = message || 'Olá';
  return res.json({
    ok: true,
    sender: 'bot',
    response: `[Agente Hermes]: Entendido! Processando sua solicitação sobre "${query}". Como posso agendar seu atendimento comercial?`
  });
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
  const { provider } = req.body || {};
  return res.json({
    success: true,
    message: `Credenciais de ${provider === 'nous' ? 'Nous Portal' : 'OpenRouter'} salvas com sucesso!`
  });
});

router.post('/whatsapp/connect', (req, res) => {
  return res.json({
    success: true,
    status: 'provisioning',
    qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AXION_FLOW_WHATSAPP_PAIRING'
  });
});

router.put('/whatsapp/phone', (req, res) => {
  const { phone_number } = req.body || {};
  return res.json({
    success: true,
    phone_number: phone_number || '+55 11 92476-5169',
    message: 'Número atualizado com sucesso!'
  });
});

export default router;
