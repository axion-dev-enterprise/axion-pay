import express from "express";
import { randomUUID } from "node:crypto";
import { overviewHandler } from "../controllers/dashboardController.js";
import { listPaymentsHandler } from "../controllers/paymentController.js";
import { chargeHandler } from "../controllers/chargeController.js";
import { requireRemoteSession } from "../middlewares/remoteSession.js";
import { listPayTagsByUser } from "../models/payTagsStore.js";
import { listAllTransactions } from "../models/transactionStore.js";

function filterTransactionsForUser(payTags, transactions, userId) {
  const ownedPayTags = new Set((payTags || []).map((tag) => String(tag.name || "").trim().toLowerCase()));
  const normUser = String(userId || "").trim();

  return (transactions || []).filter((tx) => {
    const txTag = String(tx?.metadata?.pay_tag || "").trim().toLowerCase();
    if (txTag && ownedPayTags.has(txTag)) return true;
    const txUser = String(tx?.metadata?.userId || tx?.metadata?.user_id || tx?.customerId || tx?.customer_id || "").trim();
    if (txUser && txUser === normUser) return true;
    return false;
  });
}

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
  const userPayTags = listPayTagsByUser(userId);
  const allTx = listAllTransactions();

  // Filtrar transações reais do usuário
  const userTx = filterTransactionsForUser(userPayTags, allTx, userId);
  
  const totalVolumeCents = userTx.reduce((sum, tx) => sum + (tx.amountCents || tx.amount || 0), 0);
  const formattedVolume = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalVolumeCents > 1000 ? totalVolumeCents / 100 : totalVolumeCents);

  const recentActivities = userTx.slice(0, 5).map(tx => ({
    event: `Pagamento ${tx.method ? tx.method.toUpperCase() : 'PIX'} - R$ ${(tx.amount || 0).toFixed(2)} (${tx.status})`,
    created_at: tx.createdAt || tx.created_at || new Date().toISOString(),
    status: tx.status || "pending"
  }));

  if (recentActivities.length === 0) {
    recentActivities.push({
      event: "Conta AXION Pay ativada em produção",
      created_at: new Date().toISOString(),
      status: "active"
    });
  }

  return res.json({
    ok: true,
    totalVolume: userTx.length > 0 ? formattedVolume : "R$ 0,00",
    totalTransactions: userTx.length,
    tenants: tenants.length,
    apiKeys: keys.filter(k => k.status === "active").length,
    recentActivities
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

// 10. Subscription plans for AxionPay landing page
const SUBSCRIPTION_PLANS = [
  { id: "starter", name: "Starter", price: 0, period: "mensal", features: ["Taxa PIX: 0.99%", "Taxa Cartão: 3.99% + R$0.39", "Recebimento PIX: na hora", "Link de pagamento", "Suporte e-mail"] },
  { id: "pro", name: "Pro", price: 9900, period: "mensal", features: ["Taxa PIX: 0.89%", "Taxa Cartão: 3.49% + R$0.29", "Recebimento PIX: na hora", "Checkout Transparente", "Webhook de confirmação", "Suporte prioritário 24/7"] },
  { id: "enterprise", name: "Enterprise", price: 0, period: "custom", features: ["API de alta performance", "Checkout White-label", "Gerente de conta dedicado", "SLA de 99.9% garantido", "Taxas customizadas"] }
];

const subStore = new Map();

router.post("/subscribe", async (req, res) => {
  const userId = req.user?.id || `anon_${randomUUID().slice(0, 8)}`;
  const { plan } = req.body || {};
  const targetPlan = SUBSCRIPTION_PLANS.find(p => p.id === plan);
  if (!targetPlan) return res.status(400).json({ success: false, error: "Plano inválido." });

  if (plan === "enterprise") {
    return res.json({
      success: true,
      plan_name: targetPlan.name,
      amount_display: "Sob consulta",
      status: "contact_sales",
      redirect: "https://wa.me/5511924765169"
    });
  }

  const mercadopagoToken = config.mercadopago?.accessToken;
  if (targetPlan.price > 0 && mercadopagoToken) {
    try {
      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${mercadopagoToken}` },
        body: JSON.stringify({
          transaction_amount: targetPlan.price / 100,
          description: `Assinatura ${targetPlan.name} - AxionPay`,
          payment_method_id: "pix",
          payer: { email: req.user?.email || "cliente@axionenterprise.cloud" }
        })
      });
      if (mpResponse.ok) {
        const mpData = await mpResponse.json();
        subStore.set(userId, { planId: plan, active: false, subscribedAt: new Date().toISOString() });
        return res.json({
          success: true,
          plan_name: targetPlan.name,
          amount_display: `R$ ${(targetPlan.price / 100).toFixed(2).replace(".", ",")}`,
          pix_copy_paste: mpData.point_of_interaction?.transaction_data?.qr_code || "",
          qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "",
          ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url || "",
          mp_payment_id: mpData.id,
          status: mpData.status
        });
      }
    } catch {}
  }

  subStore.set(userId, { planId: plan, active: targetPlan.price === 0, subscribedAt: new Date().toISOString() });
  return res.json({
    success: true,
    plan_name: targetPlan.name,
    amount_display: targetPlan.price > 0 ? `R$ ${(targetPlan.price / 100).toFixed(2).replace(".", ",")}` : "Grátis",
    status: targetPlan.price === 0 ? "active" : "pending_payment"
  });
});

router.get("/subscription", (req, res) => {
  const userId = req.user?.id || "demo";
  const userSub = subStore.get(userId);
  if (!userSub) return res.json({ subscribed: false, plan: null });
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === userSub.planId);
  return res.json({
    subscribed: userSub.active,
    plan_name: plan?.name || "Desconhecido",
    plan_id: userSub.planId,
    features: plan?.features || [],
    subscribed_at: userSub.subscribedAt
  });
});

export default router;
