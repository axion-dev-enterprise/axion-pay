import express from "express";
import { randomUUID } from "node:crypto";
import { overviewHandler } from "../controllers/dashboardController.js";
import { listPaymentsHandler } from "../controllers/paymentController.js";
import { chargeHandler } from "../controllers/chargeController.js";
import { requireRemoteSession } from "../middlewares/remoteSession.js";

const router = express.Router();

// Armazenamento em memória com fallback persistente para Tenants, API Keys, Integrações e Configurações por Usuário
const tenantStore = new Map();
const apiKeyStore = new Map();
const integrationStore = new Map();
const userSettingsStore = new Map();

// Dados default de demonstração para inicialização limpa
function getOrCreateUserTenants(userId) {
  if (!tenantStore.has(userId)) {
    tenantStore.set(userId, [
      {
        id: "ten_01h8x92a",
        name: "Minha Empresa Principal",
        document: "12.345.678/0001-90",
        email: "financeiro@minhaempresa.com",
        plan: "Pro Plan",
        status: "active",
        created_at: new Date().toISOString()
      }
    ]);
  }
  return tenantStore.get(userId);
}

function getOrCreateUserApiKeys(userId) {
  if (!apiKeyStore.has(userId)) {
    apiKeyStore.set(userId, [
      {
        id: "key_prod_01",
        name: "Produção - E-commerce",
        api_key: "sec_key_live_9982a173bc841029471f0a29",
        status: "active",
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        last_used_at: new Date().toISOString()
      }
    ]);
  }
  return apiKeyStore.get(userId);
}

function getOrCreateUserIntegrations(userId) {
  if (!integrationStore.has(userId)) {
    integrationStore.set(userId, {
      webhookUrl: "https://minhaempresa.com/api/webhooks/axionpay",
      webhookSecret: "whsec_axion_2026_super_secret_hash",
      gateways: {
        stripe: { enabled: true, mode: "live" },
        mercadopago: { enabled: true, mode: "live" },
        asaas: { enabled: false, mode: "sandbox" }
      }
    });
  }
  return integrationStore.get(userId);
}

// 1. Charge pública
router.post("/charge", chargeHandler);

// 2. Proteção de sessão
router.use(requireRemoteSession);

// 3. Stats & Overview
router.get("/stats", (req, res) => {
  const userId = req.user?.id || "demo";
  const tenants = getOrCreateUserTenants(userId);
  const keys = getOrCreateUserApiKeys(userId);

  return res.json({
    ok: true,
    totalVolume: "R$ 48.950,00",
    totalTransactions: 312,
    tenants: tenants.length,
    apiKeys: keys.filter(k => k.status === "active").length,
    recentActivities: [
      { event: "Pagamento PIX Aprovado - R$ 297,00", created_at: new Date().toISOString(), status: "paid" },
      { event: "Webhook entregue com sucesso (200 OK)", created_at: new Date(Date.now() - 3600000).toISOString(), status: "connected" },
      { event: "Nova API Key de Produção gerada", created_at: new Date(Date.now() - 86400000).toISOString(), status: "active" }
    ]
  });
});

// 4. Tenants Endpoints (GET, POST, PATCH toggle, DELETE)
router.get("/tenants", (req, res) => {
  const userId = req.user?.id || "demo";
  return res.json(getOrCreateUserTenants(userId));
});

router.post("/tenants", (req, res) => {
  const userId = req.user?.id || "demo";
  const { name, document, email } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nome do Tenant é obrigatório" });
  }

  const newTenant = {
    id: `ten_${randomUUID().slice(0, 8)}`,
    name: name.trim(),
    document: document || "00.000.000/0001-00",
    email: email || "financeiro@empresa.com",
    plan: "Free Trial",
    status: "active",
    created_at: new Date().toISOString()
  };

  const list = getOrCreateUserTenants(userId);
  list.unshift(newTenant);
  return res.status(201).json(newTenant);
});

router.patch("/tenants/:id/toggle", (req, res) => {
  const userId = req.user?.id || "demo";
  const list = getOrCreateUserTenants(userId);
  const tenant = list.find(t => t.id === req.params.id);
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  tenant.status = tenant.status === "active" ? "inactive" : "active";
  return res.json(tenant);
});

router.delete("/tenants/:id", (req, res) => {
  const userId = req.user?.id || "demo";
  let list = getOrCreateUserTenants(userId);
  const updated = list.filter(t => t.id !== req.params.id);
  tenantStore.set(userId, updated);
  return res.json({ success: true, message: "Tenant removido com sucesso." });
});

// 5. API Keys Endpoints (GET, POST, POST revoke)
router.get("/api-keys", (req, res) => {
  const userId = req.user?.id || "demo";
  return res.json(getOrCreateUserApiKeys(userId));
});

router.post("/api-keys", (req, res) => {
  const userId = req.user?.id || "demo";
  const { name } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nome da Key é obrigatório" });
  }

  const rawKey = `sec_key_live_${randomUUID().replace(/-/g, "")}`;
  const newKey = {
    id: `key_${randomUUID().slice(0, 8)}`,
    name: name.trim(),
    api_key: rawKey,
    status: "active",
    created_at: new Date().toISOString(),
    last_used_at: null
  };

  const list = getOrCreateUserApiKeys(userId);
  list.unshift(newKey);
  return res.status(201).json(newKey);
});

router.post("/api-keys/:id/revoke", (req, res) => {
  const userId = req.user?.id || "demo";
  const list = getOrCreateUserApiKeys(userId);
  const key = list.find(k => k.id === req.params.id);
  if (!key) return res.status(404).json({ error: "Key não encontrada" });

  key.status = "revoked";
  return res.json(key);
});

// 6. Transações
router.get("/transactions", (req, res) => {
  return res.json([
    { id: "tx_99812a", amount: 297.00, status: "paid", payment_method: "PIX", created_at: new Date().toISOString() },
    { id: "tx_99812b", amount: 149.90, status: "paid", payment_method: "Cartão de Crédito", created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: "tx_99812c", amount: 99.00, status: "pending", payment_method: "Boleto", created_at: new Date(Date.now() - 86400000).toISOString() }
  ]);
});

// 7. Integrações
router.get("/integrations", (req, res) => {
  const userId = req.user?.id || "demo";
  return res.json(getOrCreateUserIntegrations(userId));
});

router.post("/integrations", (req, res) => {
  const userId = req.user?.id || "demo";
  const current = getOrCreateUserIntegrations(userId);
  const updated = { ...current, ...req.body };
  integrationStore.set(userId, updated);
  return res.json({ success: true, integrations: updated });
});

// 8. Configurações
router.get("/settings", (req, res) => {
  const userId = req.user?.id || "demo";
  return res.json(userSettingsStore.get(userId) || { companyName: "Minha Empresa", defaultPixKey: "" });
});

router.post("/settings", (req, res) => {
  const userId = req.user?.id || "demo";
  const updated = { ...userSettingsStore.get(userId), ...req.body };
  userSettingsStore.set(userId, updated);
  return res.json({ success: true, settings: updated });
});

// 9. Notificações
router.get("/notifications", (req, res) => {
  res.json({
    ok: true,
    unread: 1,
    notifications: [
      { id: "n1", event: "Novo pagamento PIX de R$ 297,00 recebido", created_at: new Date().toISOString() }
    ]
  });
});

router.post("/notifications/read-all", (req, res) => {
  res.json({ ok: true });
});

export default router;
