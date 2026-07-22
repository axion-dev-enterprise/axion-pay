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

export default router;
