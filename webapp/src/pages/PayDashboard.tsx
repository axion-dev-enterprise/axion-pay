import "../workspace-theme.css";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Building2,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  LogIn,
  LogOut,
  LayoutDashboard,
  ExternalLink,
  Settings,
  User,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  Menu,
  Bell,
  BarChart3,
  Wallet,
  Activity,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Filter,
  Globe,
  Lock,
  X,
  Building,
  FileCheck2,
  QrCode,
  CreditCard,
  ArrowUpRight,
  Banknote,
  Coins,
  Percent,
  CalendarClock,
  DollarSign,
  Webhook,
  Send,
  Eye,
  EyeOff,
  Code2,
  Play,
  Link2,
  Share2,
  MessageSquare,
  CheckCheck,
  Smartphone,
  Users,
} from "lucide-react";

const AUTH_API = "https://auth.axionenterprise.cloud";
const API_BASE = "https://api.axionenterprise.cloud";

async function clearAuth() {
  try {
    await fetch(`${AUTH_API}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch { /* A sessão é HttpOnly; nenhuma cópia local é mantida pelo portal. */ }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // A request without a payload must not advertise a JSON body. Besides being
  // semantically incorrect for GET and action-only POST endpoints, some API
  // gateways reject this combination before the request reaches the handler.
  const hasBody = options.body !== undefined && options.body !== null && options.body !== "";
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Cache-busting para garantir que o navegador nunca sirva respostas defasadas em GET
  // Nota: cache: "no-store" e timestamp _t não disparam preflight CORS restrito
  const isGet = !options.method || options.method.toUpperCase() === "GET";
  const separator = path.includes("?") ? "&" : "?";
  const url = isGet ? `${API_BASE}${path}${separator}_t=${Date.now()}` : `${API_BASE}${path}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...options,
      headers,
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`, traceId: data?.error?.traceId };
    }
    return data || { error: "Resposta vazia do servidor" };
  } catch (err: any) {
    return { error: "Erro de conexão com o servidor de pagamentos." };
  }
}

async function checkAuth() {
  // The Core is the authorization boundary for this dashboard. Validating the
  // shared HttpOnly session here proves that the cookie reached the API and
  // that the API could validate it against Auth before any dashboard request.
  try {
    const res = await fetch(`${API_BASE}/v1/dashboard/me?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      credentials: "include"
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.user) return data.user;
  } catch {
    // Falha fechada: sem confirmação pela Core, o painel não é liberado.
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toLowerCase();
  const isOk = normalized === "active" || normalized === "paid";
  const isPending = normalized === "pending" || normalized === "creating";
  const isBad = normalized === "revoked" || normalized === "failed" || normalized === "expired" || normalized === "inactive";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
        isOk
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : isPending
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : isBad
          ? "bg-red-500/10 text-red-400 border-red-500/20"
          : "bg-[#182b20] text-[#a1b0a6] border-[#30513d]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOk ? "bg-emerald-400 animate-pulse" : isPending ? "bg-amber-400 animate-spin" : "bg-zinc-500"
        }`}
      />
      {status}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#182b20] hover:bg-[#294333] text-xs font-mono text-[#b5c6bb] transition-all border border-[#30513d] cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copiar</span>
        </>
      )}
    </button>
  );
}

type ToastState = { type: "success" | "error" | "info"; message: string } | null;
type OnboardingForm = {
  legalEntityType: "INDIVIDUAL" | "BUSINESS";
  legalName: string;
  tradingName: string;
  documentNumber: string;
  billingEmail: string;
  phoneE164: string;
  countryCode: string;
  websiteUrl: string;
  businessDescription: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

type OnboardingField = keyof OnboardingForm;
type OnboardingErrors = Partial<Record<OnboardingField, string>>;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string, countryCode: string) {
  const digits = onlyDigits(value);
  if (countryCode === "BR") {
    const local = (digits.startsWith("55") ? digits.slice(2) : digits).slice(0, 11);
    if (!local) return "+55 ";
    if (local.length <= 2) return `+55 (${local}`;
    if (local.length <= 6) return `+55 (${local.slice(0, 2)}) ${local.slice(2)}`;
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}${local.length > 7 ? `-${local.slice(7)}` : ""}`;
  }
  return value.replace(/[^\d+]/g, "").slice(0, 16);
}

function normalizePhone(value: string, countryCode: string) {
  const digits = onlyDigits(value);
  if (countryCode === "BR") {
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    return `+55${local}`;
  }
  return value.trim().startsWith("+") ? `+${digits}` : `+${digits}`;
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const emptyOnboardingForm: OnboardingForm = {
  legalEntityType: "BUSINESS",
  legalName: "",
  tradingName: "",
  documentNumber: "",
  billingEmail: "",
  phoneE164: "+55",
  countryCode: "BR",
  websiteUrl: "",
  businessDescription: "",
  acceptTerms: false,
  acceptPrivacy: false,
};

const VALID_SECTIONS: Record<string, string> = {
  "": "overview",
  "overview": "overview",
  "merchants": "merchants",
  "api-keys": "api-keys",
  "webhooks": "webhooks",
  "transactions": "transactions",
  "payouts": "payouts",
  "saques": "payouts",
  "onboarding": "onboarding",
  "kyc": "onboarding",
  "kyc-review": "kyc-review",
  "kyc-applications": "kyc-review",
  "billing": "billing",
  "payment-links": "payment-links",
  "whatsapp": "whatsapp",
  "api-logs": "api-logs",
  "logs": "api-logs",
  "subscriptions": "subscriptions",
  "assinaturas": "subscriptions",
  "portal": "subscriptions",
  "integrations": "integrations",
  "settings": "settings",
};

function getSectionFromPath(pathname: string): string {
  const normalized = pathname.replace(/^\/dashboard\/?/, "").replace(/\/+$/, "");
  const segment = normalized.split("/")[0]?.trim().toLowerCase() || "";
  return VALID_SECTIONS[segment] || "overview";
}

export default function PayDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = getSectionFromPath(location.pathname);

  const setActiveSection = (section: string) => {
    const targetPath = section === "overview" ? "/dashboard" : `/dashboard/${section}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  useEffect(() => {
    const titles: Record<string, string> = {
      overview: "AXION Pay — Visão Geral",
      merchants: "AXION Pay — Merchants & Operações",
      "api-keys": "AXION Pay — Chaves de API",
      webhooks: "AXION Pay — Webhooks por Merchant",
      "payment-links": "AXION Pay — Links de Pagamento",
      "api-logs": "AXION Pay — Logs de API",
      subscriptions: "AXION Pay — Assinaturas & Portal",
      transactions: "AXION Pay — Transações",
      payouts: "AXION Pay — Saques & Saldos",
      onboarding: "AXION Pay — Cadastro & KYC",
      "kyc-review": "AXION Pay — Análise KYC",
      billing: "AXION Pay — Plano & Cobrança",
      integrations: "AXION Pay — Integrações",
      settings: "AXION Pay — Configurações",
    };
    if (titles[activeSection]) {
      document.title = titles[activeSection];
    }
  }, [activeSection]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Estados dos Dados Reais da API
  const [overview, setOverview] = useState<{
    merchants: number;
    activeKeys: number;
    transactionsToday: number;
    volumeMonthCents: number;
  }>({
    merchants: 0,
    activeKeys: 0,
    transactionsToday: 0,
    volumeMonthCents: 0,
  });

  const [merchants, setMerchants] = useState<Array<any>>([]);
  const [apiKeys, setApiKeys] = useState<Array<any>>([]);
  const [transactions, setTransactions] = useState<Array<any>>([]);
  const [integrations, setIntegrations] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>(emptyOnboardingForm);
  const [kycFieldErrors, setKycFieldErrors] = useState<OnboardingErrors>({});
  const [canReviewKyc, setCanReviewKyc] = useState(false);
  const [kycApplications, setKycApplications] = useState<Array<any>>([]);
  const [kycReviewModal, setKycReviewModal] = useState<any>(null);
  const [kycReviewStatus, setKycReviewStatus] = useState<"IN_REVIEW" | "ACTION_REQUIRED" | "APPROVED" | "REJECTED">("IN_REVIEW");
  const [kycReviewReason, setKycReviewReason] = useState("");
  const [settings, setSettings] = useState<{ organizationName: string | null }>({
    organizationName: null,
  });

  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  // WhatsApp Notification Cadence State
  const [selectedWhatsappMerchantId, setSelectedWhatsappMerchantId] = useState<string>("");
  const [whatsappSettings, setWhatsappSettings] = useState<any>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [activeWhatsappTab, setActiveWhatsappTab] = useState<string>("pix_created");
  // Estados de Assinaturas & Portal do Assinante
  const [selectedSubMerchantId, setSelectedSubMerchantId] = useState<string>("");
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [subMetrics, setSubMetrics] = useState<{ activeCount: number; totalCount: number; activeMrrCents: number; churnRatePercent: number } | null>(null);
  const [loadingSubs, setLoadingSubs] = useState<boolean>(false);
  const [newSubModal, setNewSubModal] = useState<boolean>(false);
  const [newSubForm, setNewSubForm] = useState({
    customerName: "",
    customerEmail: "",
    customerTaxId: "",
    customerPhone: "",
    planName: "Plano Pro Mensal",
    amountCents: 9900,
    interval: "MONTH",
    paymentMethodBrand: "mastercard",
    paymentMethodLast4: "4242",
  });
  const [createdPortalUrlModal, setCreatedPortalUrlModal] = useState<{ url: string; customerName: string } | null>(null);

  useEffect(() => {
    if (!selectedSubMerchantId && merchants.length > 0) {
      setSelectedSubMerchantId(merchants[0].id);
    }
  }, [merchants, selectedSubMerchantId]);

  const loadSubscriptions = async (merchantId: string) => {
    if (!merchantId) return;
    setLoadingSubs(true);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${merchantId}/subscriptions`);
      if (res?.subscriptions) {
        setSubscriptionsList(res.subscriptions);
        setSubMetrics(res.metrics || null);
      }
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    if (activeSection === "subscriptions" && selectedSubMerchantId) {
      loadSubscriptions(selectedSubMerchantId);
    }
  }, [activeSection, selectedSubMerchantId]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubMerchantId) return;
    setSubmittingAction("create-sub");
    try {
      // Cria plano temporário / ou busca plano do merchant
      // Cria assinatura direta
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedSubMerchantId}/subscriptions`, {
        method: "POST",
        body: JSON.stringify({
          customerName: newSubForm.customerName,
          customerEmail: newSubForm.customerEmail,
          customerTaxId: newSubForm.customerTaxId || undefined,
          customerPhone: newSubForm.customerPhone || undefined,
          paymentMethodBrand: newSubForm.paymentMethodBrand,
          paymentMethodLast4: newSubForm.paymentMethodLast4,
        }),
      });

      if (res?.subscription) {
        notify("success", "Assinatura cadastrada e Portal gerado com sucesso!");
        setNewSubModal(false);
        setCreatedPortalUrlModal({
          url: res.subscription.portalUrl,
          customerName: newSubForm.customerName,
        });
        setNewSubForm({
          customerName: "",
          customerEmail: "",
          customerTaxId: "",
          customerPhone: "",
          planName: "Plano Pro Mensal",
          amountCents: 9900,
          interval: "MONTH",
          paymentMethodBrand: "mastercard",
          paymentMethodLast4: "4242",
        });
        await loadSubscriptions(selectedSubMerchantId);
      } else {
        notify("error", res?.error || "Erro ao criar assinatura.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  // Estados do API Logs Explorer (Request Inspector)
  const [selectedApiLogMerchantId, setSelectedApiLogMerchantId] = useState<string>("");
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [apiLogMetrics, setApiLogMetrics] = useState<any>(null);
  const [loadingApiLogs, setLoadingApiLogs] = useState<boolean>(false);
  const [apiLogMethodFilter, setApiLogMethodFilter] = useState<string>("ALL");
  const [apiLogStatusFilter, setApiLogStatusFilter] = useState<string>("ALL");
  const [apiLogSearch, setApiLogSearch] = useState<string>("");
  const [autoRefreshLogs, setAutoRefreshLogs] = useState<boolean>(false);
  const [inspectedLog, setInspectedLog] = useState<any>(null);
  const [inspectedLogTab, setInspectedLogTab] = useState<"general" | "req_headers" | "req_body" | "res_body" | "curl">("general");
  const [purgingLogs, setPurgingLogs] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedApiLogMerchantId && merchants.length > 0) {
      setSelectedApiLogMerchantId(merchants[0].id);
    }
  }, [merchants, selectedApiLogMerchantId]);

  const loadApiLogs = async (merchantId: string, silent = false) => {
    if (!merchantId) return;
    if (!silent) setLoadingApiLogs(true);
    try {
      const params = new URLSearchParams();
      if (apiLogMethodFilter !== "ALL") params.set("method", apiLogMethodFilter);
      if (apiLogStatusFilter !== "ALL") params.set("statusCode", apiLogStatusFilter);
      if (apiLogSearch.trim()) params.set("search", apiLogSearch.trim());
      params.set("limit", "50");

      const res = await apiFetch(`/v1/dashboard/merchants/${merchantId}/api-logs?${params.toString()}`);
      if (res) {
        setApiLogs(res.logs || []);
        if (res.metrics) setApiLogMetrics(res.metrics);
      }
    } catch (err: any) {
      if (!silent) notify("error", "Erro ao carregar logs de API: " + (err.message || ""));
    } finally {
      if (!silent) setLoadingApiLogs(false);
    }
  };

  useEffect(() => {
    if (selectedApiLogMerchantId && activeSection === "api-logs") {
      loadApiLogs(selectedApiLogMerchantId);
    }
  }, [selectedApiLogMerchantId, activeSection, apiLogMethodFilter, apiLogStatusFilter]);

  useEffect(() => {
    let interval: any;
    if (autoRefreshLogs && selectedApiLogMerchantId && activeSection === "api-logs") {
      interval = setInterval(() => {
        loadApiLogs(selectedApiLogMerchantId, true);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshLogs, selectedApiLogMerchantId, activeSection, apiLogMethodFilter, apiLogStatusFilter, apiLogSearch]);

  const handleClearApiLogs = async () => {
    if (!selectedApiLogMerchantId) return;
    if (!window.confirm("Deseja realmente purgar todo o histórico de logs de API deste merchant?")) return;
    setPurgingLogs(true);
    try {
      await apiFetch(`/v1/dashboard/merchants/${selectedApiLogMerchantId}/api-logs`, {
        method: "DELETE",
      });
      notify("success", "Logs de API purgados com sucesso!");
      await loadApiLogs(selectedApiLogMerchantId);
    } catch (err: any) {
      notify("error", err.message || "Erro ao purgar logs.");
    } finally {
      setPurgingLogs(false);
    }
  };

  const [testWhatsappModal, setTestWhatsappModal] = useState(false);
  const [testWhatsappPhone, setTestWhatsappPhone] = useState("");
  const [testWhatsappEvent, setTestWhatsappEvent] = useState<string>("pix_created");
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testWhatsappResult, setTestWhatsappResult] = useState<any>(null);

  // Auto-select merchant for WhatsApp
  useEffect(() => {
    if (!selectedWhatsappMerchantId && merchants.length > 0) {
      setSelectedWhatsappMerchantId(merchants[0].id);
    }
  }, [merchants, selectedWhatsappMerchantId]);

  const loadWhatsappData = async (merchantId: string) => {
    if (!merchantId) return;
    setLoadingWhatsapp(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        apiFetch(`/v1/dashboard/merchants/${merchantId}/whatsapp/settings`),
        apiFetch(`/v1/dashboard/merchants/${merchantId}/whatsapp/logs`),
      ]);
      if (settingsRes) setWhatsappSettings(settingsRes);
      if (logsRes?.logs) setWhatsappLogs(logsRes.logs);
    } catch (err: any) {
      notify("error", "Erro ao carregar configurações de WhatsApp: " + (err.message || ""));
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  useEffect(() => {
    if (selectedWhatsappMerchantId && activeSection === "whatsapp") {
      loadWhatsappData(selectedWhatsappMerchantId);
    }
  }, [selectedWhatsappMerchantId, activeSection]);

  const handleSaveWhatsappSettings = async (updates: Record<string, any>) => {
    if (!selectedWhatsappMerchantId) return;
    setSavingWhatsapp(true);
    try {
      const updated = await apiFetch(`/v1/dashboard/merchants/${selectedWhatsappMerchantId}/whatsapp/settings`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      setWhatsappSettings(updated);
      notify("success", "Configurações de WhatsApp salvas com sucesso!");
    } catch (err: any) {
      notify("error", err.message || "Erro ao salvar configurações.");
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleSendTestWhatsapp = async () => {
    if (!selectedWhatsappMerchantId) return;
    if (!testWhatsappPhone.trim()) {
      notify("error", "Informe o número de telefone com DDD.");
      return;
    }
    setTestingWhatsapp(true);
    setTestWhatsappResult(null);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedWhatsappMerchantId}/whatsapp/test`, {
        method: "POST",
        body: JSON.stringify({
          phone: testWhatsappPhone.trim(),
          eventType: testWhatsappEvent,
        }),
      });
      setTestWhatsappResult(res);
      notify("success", "Mensagem de teste enviada com sucesso!");
      loadWhatsappData(selectedWhatsappMerchantId);
    } catch (err: any) {
      setTestWhatsappResult({ success: false, error: err.message });
      notify("error", err.message || "Falha ao enviar mensagem de teste.");
    } finally {
      setTestingWhatsapp(false);
    }
  };

  const insertVariableTag = (tag: string) => {
    if (!whatsappSettings) return;
    const currentTemplateKey =
      activeWhatsappTab === "pix_created"
        ? "templatePixCreated"
        : activeWhatsappTab === "payment_approved"
        ? "templatePaymentApproved"
        : activeWhatsappTab === "pix_expiring"
        ? "templatePixExpiring"
        : "templateSubscriptionFailed";

    const currentVal = whatsappSettings[currentTemplateKey] || "";
    setWhatsappSettings({
      ...whatsappSettings,
      [currentTemplateKey]: currentVal + " " + tag,
    });
  };

  const [pendingRevoke, setPendingRevoke] = useState<{ id: string; name: string } | null>(null);

  // Modais de Criação
  const [merchantModal, setMerchantModal] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState("");
  const [newMerchantDoc, setNewMerchantDoc] = useState("");
  const [newMerchantEmail, setNewMerchantEmail] = useState("");

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [keyMerchantId, setKeyMerchantId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Estados de Saques, Saldos e Taxas
  const [balances, setBalances] = useState<{
    availableBalanceCents: number;
    pendingBalanceCents: number;
    totalPaidOutCents: number;
    grossVolumeCents: number;
    totalFeesCents: number;
    pixKey: string | null;
    pixKeyType: string | null;
    rates: {
      feePixPercent: number;
      feePixFixedCents: number;
      feeCardPercent: number;
      feePayoutFixedCents: number;
      settlementDaysPix: number;
      settlementDaysCard: number;
    };
  } | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [pixKeyModal, setPixKeyModal] = useState(false);
  const [selectedPixType, setSelectedPixType] = useState<"CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM">("CPF");
  const [pixKeyValue, setPixKeyValue] = useState("");
  const [ratesModal, setRatesModal] = useState(false);
  const [editingRatesMerchant, setEditingRatesMerchant] = useState<any>(null);
  const [editFeePixPercent, setEditFeePixPercent] = useState("1.99");
  const [editFeePixFixed, setEditFeePixFixed] = useState("0.50");
  const [editFeeCardPercent, setEditFeeCardPercent] = useState("3.49");
  const [editFeePayout, setEditFeePayout] = useState("2.00");
  const [editSettlementPix, setEditSettlementPix] = useState("0");
  const [editSettlementCard, setEditSettlementCard] = useState("14");

  // Estados de Webhooks por Merchant
  const [selectedWebhookMerchantId, setSelectedWebhookMerchantId] = useState<string>("");
  const [webhooks, setWebhooks] = useState<Array<any>>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<Array<any>>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookModal, setWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<string[]>([
    "payment.succeeded",
    "payment.failed",
    "subscription.created",
    "subscription.renewed",
  ]);
  const [revealedWebhookSecrets, setRevealedWebhookSecrets] = useState<Record<string, boolean>>({});
  const [newWebhookSecretModal, setNewWebhookSecretModal] = useState<{ id: string; url: string; secret: string } | null>(null);
  const [inspectingDelivery, setInspectingDelivery] = useState<any | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookTab, setWebhookTab] = useState<"webhooks" | "endpoints">("webhooks");

  // Estados de Links de Pagamento Autônomos
  const [selectedPaymentLinkMerchantId, setSelectedPaymentLinkMerchantId] = useState<string>("");
  const [paymentLinks, setPaymentLinks] = useState<Array<any>>([]);
  const [loadingPaymentLinks, setLoadingPaymentLinks] = useState(false);
  const [paymentLinkModal, setPaymentLinkModal] = useState(false);
  const [newPaymentLinkTitle, setNewPaymentLinkTitle] = useState("");
  const [newPaymentLinkDesc, setNewPaymentLinkDesc] = useState("");
  const [newPaymentLinkAmount, setNewPaymentLinkAmount] = useState("");
  const [newPaymentLinkCustom, setNewPaymentLinkCustom] = useState(false);
  const [newPaymentLinkMethods, setNewPaymentLinkMethods] = useState<string[]>(["PIX", "CARD"]);
  const [newPaymentLinkExpiresAt, setNewPaymentLinkExpiresAt] = useState("");
  const [newPaymentLinkMaxUses, setNewPaymentLinkMaxUses] = useState("");
  const [createdLinkUrlModal, setCreatedLinkUrlModal] = useState<{ id: string; url: string; title: string } | null>(null);

  const notify = (type: NonNullable<ToastState>["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const updateOnboardingField = <K extends OnboardingField>(field: K, value: OnboardingForm[K]) => {
    setOnboardingForm((current) => ({ ...current, [field]: value }));
    setKycFieldErrors({});
  };

  const getOnboardingErrors = (): OnboardingErrors => {
    const errors: OnboardingErrors = {};
    const documentDigits = onlyDigits(onboardingForm.documentNumber);
    const expectedDocumentLength = onboardingForm.legalEntityType === "INDIVIDUAL" ? 11 : 14;
    const phoneDigits = onlyDigits(normalizePhone(onboardingForm.phoneE164, onboardingForm.countryCode));

    if (onboardingForm.legalName.trim().length < 2) errors.legalName = "Informe o nome legal da organização ou da pessoa.";
    if (documentDigits.length !== expectedDocumentLength) {
      errors.documentNumber = onboardingForm.legalEntityType === "INDIVIDUAL"
        ? "Informe os 11 dígitos do CPF."
        : "Informe os 14 dígitos do CNPJ.";
    }
    if (!/^\S+@\S+\.\S+$/.test(onboardingForm.billingEmail.trim())) errors.billingEmail = "Informe um e-mail financeiro válido.";
    if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.phoneE164 = "Informe um telefone válido com DDD.";
    if (onboardingForm.websiteUrl.trim() && !/^https?:\/\/[^\s]+$/i.test(normalizeWebsite(onboardingForm.websiteUrl))) errors.websiteUrl = "Informe uma URL válida ou deixe o campo em branco.";
    if (onboardingForm.businessDescription.trim().length < 5) errors.businessDescription = "Descreva a atividade em ao menos 5 caracteres.";
    if (!onboardingForm.acceptTerms) errors.acceptTerms = "Você precisa aceitar os termos para enviar a solicitação.";
    if (!onboardingForm.acceptPrivacy) errors.acceptPrivacy = "Você precisa aceitar a política de privacidade para enviar a solicitação.";
    return errors;
  };

  const onboardingPayload = () => ({
    legalEntityType: onboardingForm.legalEntityType,
    legalName: onboardingForm.legalName.trim(),
    tradingName: onboardingForm.tradingName.trim(),
    documentNumber: onlyDigits(onboardingForm.documentNumber),
    billingEmail: onboardingForm.billingEmail.trim(),
    phoneE164: normalizePhone(onboardingForm.phoneE164, onboardingForm.countryCode),
    countryCode: onboardingForm.countryCode.trim().toUpperCase(),
    websiteUrl: normalizeWebsite(onboardingForm.websiteUrl),
    businessDescription: onboardingForm.businessDescription.trim(),
    acceptTerms: onboardingForm.acceptTerms,
    acceptPrivacy: onboardingForm.acceptPrivacy,
  });

  const applyOnboardingProfile = (profile: any) => {
    setOnboarding(profile);
    if (!profile) return;
    setOnboardingForm({
      legalEntityType: profile.legalEntityType === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS",
      legalName: profile.legalName || "",
      tradingName: profile.tradingName || "",
      documentNumber: "",
      billingEmail: profile.billingEmail || "",
      phoneE164: profile.phoneE164 || "+55",
      countryCode: profile.countryCode || "BR",
      websiteUrl: profile.websiteUrl || "",
      businessDescription: profile.businessDescription || "",
      acceptTerms: Boolean(profile.termsAcceptedAt),
      acceptPrivacy: Boolean(profile.privacyAcceptedAt),
    });
  };

  // 1. Inicialização de Autenticação
  useEffect(() => {
    checkAuth().then(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        await loadAllData();
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!pendingRevoke) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingAction) setPendingRevoke(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingRevoke, submittingAction]);

  const loadAllData = async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const [ovRes, mRes, kRes, txRes, intRes, stRes, onboardingRes, billingRes, balRes, payRes] = await Promise.allSettled([
        apiFetch("/v1/dashboard/overview"),
        apiFetch("/v1/dashboard/merchants"),
        apiFetch("/v1/dashboard/api-keys"),
        apiFetch("/v1/dashboard/transactions"),
        apiFetch("/v1/dashboard/integrations"),
        apiFetch("/v1/dashboard/settings"),
        apiFetch("/v1/dashboard/onboarding"),
        apiFetch("/v1/dashboard/billing"),
        apiFetch("/v1/dashboard/balances"),
        apiFetch("/v1/dashboard/payouts"),
      ]);

      const ov = ovRes.status === "fulfilled" ? ovRes.value : null;
      const m = mRes.status === "fulfilled" ? mRes.value : null;
      const k = kRes.status === "fulfilled" ? kRes.value : null;
      const tx = txRes.status === "fulfilled" ? txRes.value : null;
      const int = intRes.status === "fulfilled" ? intRes.value : null;
      const st = stRes.status === "fulfilled" ? stRes.value : null;
      const onb = onboardingRes.status === "fulfilled" ? onboardingRes.value : null;
      const bill = billingRes.status === "fulfilled" ? billingRes.value : null;
      const bal = balRes.status === "fulfilled" ? balRes.value : null;
      const pay = payRes.status === "fulfilled" ? payRes.value : null;

      if (ov && !ov.error) setOverview(ov);
      if (m?.merchants) {
        setMerchants(m.merchants);
        setSelectedWebhookMerchantId((prev) => prev || (m.merchants.length > 0 ? m.merchants[0].id : ""));
      }
      if (k?.keys) setApiKeys(k.keys);
      if (tx?.transactions) setTransactions(tx.transactions);
      if (bal?.balance) setBalances(bal.balance);
      if (pay?.payouts) setPayouts(pay.payouts);
      if (int && !int.error) setIntegrations(int);
      if (st?.settings) setSettings(st.settings);
      if (onb && !onb.error) {
        applyOnboardingProfile(onb.onboarding);
        const reviewer = Boolean(onb.canReviewKyc);
        setCanReviewKyc(reviewer);
        if (reviewer) {
          const reviewRes = await apiFetch("/v1/internal/kyc/applications?status=SUBMITTED");
          if (reviewRes?.applications) setKycApplications(reviewRes.applications);
        }
      }
      setOnboardingLoaded(true);
      if (bill && !bill.error) setBilling(bill.billing);
    } catch (err: any) {
      setErrorMessage("Erro ao carregar dados do dashboard.");
    } finally {
      setLoadingData(false);
      setOnboardingLoaded(true);
    }
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantName.trim()) return;
    setSubmittingAction("merchant");
    try {
      const res = await apiFetch("/v1/dashboard/merchants", {
        method: "POST",
        body: JSON.stringify({
          name: newMerchantName.trim(),
          document: newMerchantDoc.trim() || undefined,
          billingEmail: newMerchantEmail.trim() || undefined,
        }),
      });
      if (res?.merchant) {
        setMerchantModal(false);
        setNewMerchantName("");
        setNewMerchantDoc("");
        setNewMerchantEmail("");
        // 1. Atualização reativa imediata na UI (elimina sensação de vazio)
        setMerchants((prev) => [res.merchant, ...prev.filter((m) => m.id !== res.merchant.id)]);
        setOverview((prev) => ({ ...prev, merchants: Math.max(prev.merchants + 1, prev.merchants) }));
        notify("success", "Merchant cadastrado e isolado para esta organização.");
        // 2. Sincronização em background para garantir integridade relacional
        await loadAllData();
      } else {
        notify("error", res?.error || "Não foi possível cadastrar o merchant.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleToggleMerchantStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setSubmittingAction(`merchant-${id}`);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res?.merchant) {
        setMerchants((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
        );
        notify("success", nextStatus === "ACTIVE" ? "Merchant ativado." : "Merchant desativado.");
        await loadAllData();
      } else {
        notify("error", res?.error || "Não foi possível atualizar o merchant.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyMerchantId || !keyName.trim()) return;
    if (onboarding?.status !== "APPROVED") {
      setApiKeyModal(false);
      setActiveSection("onboarding");
      notify("info", "Conclua e aguarde a aprovação do KYC antes de gerar chaves de API.");
      return;
    }
    setSubmittingAction("api-key");
    try {
      const res = await apiFetch("/v1/dashboard/api-keys", {
        method: "POST",
        body: JSON.stringify({
          merchantId: keyMerchantId,
          name: keyName.trim(),
        }),
      });
      if (res?.key) {
        const createdKey = {
          ...res.key,
          merchantName: merchants.find((m) => m.id === keyMerchantId)?.name || "Merchant",
        };
        setGeneratedKey(res.key.secret);
        setApiKeys((prev) => [createdKey, ...prev.filter((k) => k.id !== res.key.id)]);
        setOverview((prev) => ({ ...prev, activeKeys: prev.activeKeys + 1 }));
        notify("success", "Chave criada. Copie-a agora: ela não será exibida novamente.");
        await loadAllData();
      } else {
        notify("error", res?.error || "Não foi possível gerar a chave de API.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    setSubmittingAction(`revoke-${id}`);
    try {
      const res = await apiFetch(`/v1/dashboard/api-keys/${id}/revoke`, {
        method: "POST",
      });
      if (res?.key || !res?.error) {
        setPendingRevoke(null);
        setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: "REVOKED" } : k)));
        setOverview((prev) => ({ ...prev, activeKeys: Math.max(0, prev.activeKeys - 1) }));
        notify("success", "Chave de API revogada imediatamente.");
        await loadAllData();
      } else {
        notify("error", res?.error || "Não foi possível revogar a chave de API.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const org = settings.organizationName?.trim();
    if (!org) return;
    setSubmittingAction("settings");
    try {
      const res = await apiFetch("/v1/dashboard/settings", {
        method: "POST",
        body: JSON.stringify({ organizationName: org }),
      });
      if (res?.settings || !res?.error) {
        setSettings({ organizationName: org });
        notify("success", "Configurações salvas com sucesso.");
        await loadAllData();
      } else {
        notify("error", res?.error || "Não foi possível salvar as configurações.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(payoutAmount.replace(",", "."));
    if (isNaN(cleanAmount) || cleanAmount < 10) {
      notify("error", "O valor mínimo de saque é de R$ 10,00.");
      return;
    }
    const amountCents = Math.round(cleanAmount * 100);
    const activeMerchant = merchants[0];
    if (!activeMerchant) {
      notify("error", "Nenhum merchant ativo encontrado para saque.");
      return;
    }
    if (!balances?.pixKey) {
      notify("error", "Cadastre uma chave Pix antes de solicitar o saque.");
      setPayoutModal(false);
      setPixKeyModal(true);
      return;
    }
    setSubmittingAction("payout");
    try {
      const res = await apiFetch("/v1/dashboard/payouts", {
        method: "POST",
        body: JSON.stringify({
          merchantId: activeMerchant.id,
          amountCents,
        }),
      });
      if (res?.payout) {
        notify("success", "Solicitação de saque Pix registrada com sucesso!");
        setPayoutModal(false);
        setPayoutAmount("");
        await loadAllData();
      } else {
        notify("error", res?.error || "Falha ao solicitar saque.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSavePixKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeMerchant = merchants[0];
    if (!activeMerchant) {
      notify("error", "Nenhum merchant ativo encontrado.");
      return;
    }
    if (!pixKeyValue.trim()) {
      notify("error", "Informe uma chave Pix válida.");
      return;
    }
    setSubmittingAction("pix-key");
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${activeMerchant.id}/pix-key`, {
        method: "PATCH",
        body: JSON.stringify({
          pixKey: pixKeyValue.trim(),
          pixKeyType: selectedPixType,
        }),
      });
      if (res?.merchant) {
        notify("success", "Chave Pix para recebimento atualizada com sucesso!");
        setPixKeyModal(false);
        await loadAllData();
      } else {
        notify("error", res?.error || "Erro ao salvar chave Pix.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveMerchantRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRatesMerchant) return;
    setSubmittingAction("rates");
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${editingRatesMerchant.id}/rates`, {
        method: "PATCH",
        body: JSON.stringify({
          feePixPercent: parseFloat(editFeePixPercent) || 1.99,
          feePixFixedCents: Math.round(parseFloat(editFeePixFixed || "0.5") * 100),
          feeCardPercent: parseFloat(editFeeCardPercent) || 3.49,
          feePayoutFixedCents: Math.round(parseFloat(editFeePayout || "2.0") * 100),
          settlementDaysPix: parseInt(editSettlementPix) || 0,
          settlementDaysCard: parseInt(editSettlementCard) || 14,
        }),
      });
      if (res?.merchant) {
        notify("success", "Taxas e prazos de liquidação atualizados com sucesso!");
        setRatesModal(false);
        setEditingRatesMerchant(null);
        await loadAllData();
      } else {
        notify("error", res?.error || "Erro ao atualizar taxas da operação.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction("onboarding-save");
    try {
      const res = await apiFetch("/v1/dashboard/onboarding", {
        method: "PUT",
        body: JSON.stringify(onboardingPayload()),
      });
      if (res?.onboarding) {
        applyOnboardingProfile(res.onboarding);
        notify("success", "Cadastro salvo. Envie-o para iniciar a revisão KYC.");
      } else {
        notify("error", res?.error || "Não foi possível salvar o cadastro.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleSubmitOnboarding = async () => {
    const errors = getOnboardingErrors();
    if (Object.keys(errors).length > 0) {
      setKycFieldErrors(errors);
      notify("info", "Revise os campos destacados antes de enviar o KYC.");
      return;
    }
    setSubmittingAction("onboarding-submit");
    try {
      // A submissão é atômica do ponto de vista do usuário: primeiro persiste a
      // edição atual, depois inicia a revisão. Isso evita validar um rascunho antigo.
      const saved = await apiFetch("/v1/dashboard/onboarding", {
        method: "PUT",
        body: JSON.stringify(onboardingPayload()),
      });
      if (!saved?.onboarding) {
        notify("error", saved?.error || "Não foi possível salvar os dados antes da revisão.");
        return;
      }
      const res = await apiFetch("/v1/dashboard/onboarding/submit", { method: "POST" });
      if (res?.onboarding) {
        applyOnboardingProfile(res.onboarding);
        notify("success", "KYC enviado para revisão. A emissão de chaves será liberada após aprovação.");
      } else {
        notify("error", res?.error || "Não foi possível enviar o KYC. Revise os campos e tente novamente.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleReviewKyc = async () => {
    if (!kycReviewModal) return;
    if (["ACTION_REQUIRED", "REJECTED"].includes(kycReviewStatus) && kycReviewReason.trim().length < 3) {
      notify("error", "Informe o motivo para solicitar ajustes ou rejeitar o KYC.");
      return;
    }
    setSubmittingAction("kyc-review");
    try {
      const res = await apiFetch(`/v1/internal/kyc/applications/${encodeURIComponent(kycReviewModal.authUserId)}/review`, {
        method: "POST",
        body: JSON.stringify({ status: kycReviewStatus, reason: kycReviewReason.trim() || undefined }),
      });
      if (res?.onboarding) {
        setKycApplications((current) => current.filter((item) => item.authUserId !== kycReviewModal.authUserId));
        setKycReviewModal(null);
        setKycReviewReason("");
        notify("success", "Decisão KYC registrada com trilha de auditoria.");
      } else {
        notify("error", res?.error || "Não foi possível registrar a decisão KYC.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleBillingCheckout = async () => {
    setSubmittingAction("billing-checkout");
    try {
      const res = await apiFetch("/v1/dashboard/billing/checkout", { method: "POST" });
      if (res?.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return;
      }
      notify("error", res?.error || "Não foi possível iniciar o checkout seguro.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleBillingPortal = async () => {
    setSubmittingAction("billing-portal");
    try {
      const res = await apiFetch("/v1/dashboard/billing/portal", { method: "POST" });
      if (res?.portalUrl) {
        window.location.assign(res.portalUrl);
        return;
      }
      notify("error", res?.error || "Não foi possível abrir a gestão da assinatura.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const AVAILABLE_WEBHOOK_EVENTS = [
    { id: "payment.succeeded", label: "Pagamento Aprovado", desc: "Disparado na confirmação de pagamento PIX ou Cartão" },
    { id: "payment.failed", label: "Pagamento Recusado / Expirado", desc: "Cobrança cancelada, recusada ou expirada" },
    { id: "subscription.created", label: "Nova Assinatura Recorrente", desc: "Cliente aderiu a um plano de assinatura recorrente" },
    { id: "subscription.renewed", label: "Assinatura Renovada", desc: "Cobrança de ciclo recorrente processada com sucesso" },
    { id: "subscription.past_due", label: "Tentativa de Cobrança Falhou", desc: "Cartão recusado ou sem saldo no ciclo recorrente" },
    { id: "subscription.canceled", label: "Assinatura Cancelada", desc: "Cancelamento efetuado na assinatura recorrente" },
  ];

  const loadWebhooks = async (merchantId: string) => {
    if (!merchantId) return;
    setLoadingWebhooks(true);
    try {
      const [whRes, delRes] = await Promise.allSettled([
        apiFetch(`/v1/dashboard/merchants/${merchantId}/webhooks`),
        apiFetch(`/v1/dashboard/merchants/${merchantId}/webhooks/deliveries`),
      ]);
      if (whRes.status === "fulfilled" && whRes.value?.webhooks) {
        setWebhooks(whRes.value.webhooks);
      }
      if (delRes.status === "fulfilled" && delRes.value?.deliveries) {
        setWebhookDeliveries(delRes.value.deliveries);
      }
    } catch {
      // Ignora falhas de polling
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    if (selectedWebhookMerchantId && (activeSection === "webhooks" || activeSection === "integrations")) {
      loadWebhooks(selectedWebhookMerchantId);
    }
  }, [selectedWebhookMerchantId, activeSection]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWebhookMerchantId) {
      notify("error", "Selecione uma operação / merchant para cadastrar o webhook.");
      return;
    }
    const cleanUrl = newWebhookUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      notify("error", "A URL de callback deve começar com https:// ou http://.");
      return;
    }
    if (!selectedWebhookEvents.length) {
      notify("error", "Selecione ao menos um evento para o webhook monitorar.");
      return;
    }
    setSubmittingAction("create-webhook");
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedWebhookMerchantId}/webhooks`, {
        method: "POST",
        body: JSON.stringify({
          url: cleanUrl,
          events: selectedWebhookEvents,
        }),
      });
      if (res?.webhook) {
        notify("success", "Endpoint de webhook registrado com sucesso!");
        setNewWebhookSecretModal({
          id: res.webhook.id,
          url: res.webhook.url,
          secret: res.webhook.secret,
        });
        setWebhookModal(false);
        setNewWebhookUrl("");
        await loadWebhooks(selectedWebhookMerchantId);
      } else {
        notify("error", res?.error || "Erro ao cadastrar webhook.");
      }
    } catch {
      notify("error", "Falha de rede ao registrar webhook.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!selectedWebhookMerchantId) return;
    setSubmittingAction(`del-webhook-${webhookId}`);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedWebhookMerchantId}/webhooks/${webhookId}`, {
        method: "DELETE",
      });
      if (res?.deleted) {
        notify("success", "Endpoint de webhook removido com sucesso.");
        setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
        await loadWebhooks(selectedWebhookMerchantId);
      } else {
        notify("error", res?.error || "Erro ao excluir webhook.");
      }
    } catch {
      notify("error", "Falha de comunicação com o gateway.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    if (!selectedWebhookMerchantId) return;
    setTestingWebhookId(webhookId);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedWebhookMerchantId}/webhooks/${webhookId}/test`, {
        method: "POST",
      });
      if (res?.success) {
        notify("success", `Disparo de teste entregue com sucesso (HTTP ${res.statusCode || 200})!`);
      } else {
        notify("info", `Disparo realizado com aviso: ${res?.error || `HTTP ${res?.statusCode || 'indisponível'}`}`);
      }
      await loadWebhooks(selectedWebhookMerchantId);
    } catch {
      notify("error", "Erro ao conectar com o endpoint de teste.");
    } finally {
      setTestingWebhookId(null);
    }
  };

  const toggleWebhookEvent = (eventName: string) => {
    setSelectedWebhookEvents((prev) =>
      prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName]
    );
  };

  const toggleRevealSecret = (id: string) => {
    setRevealedWebhookSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadPaymentLinks = async (merchantId: string) => {
    if (!merchantId) return;
    setLoadingPaymentLinks(true);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${merchantId}/payment-links`);
      if (res?.links) setPaymentLinks(res.links);
    } catch {
      // Ignora falhas transitórias
    } finally {
      setLoadingPaymentLinks(false);
    }
  };

  useEffect(() => {
    if (!selectedPaymentLinkMerchantId && merchants.length > 0) {
      setSelectedPaymentLinkMerchantId(merchants[0].id);
    }
  }, [merchants, selectedPaymentLinkMerchantId]);

  useEffect(() => {
    if (selectedPaymentLinkMerchantId && activeSection === "payment-links") {
      loadPaymentLinks(selectedPaymentLinkMerchantId);
    }
  }, [selectedPaymentLinkMerchantId, activeSection]);

  const handleCreatePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentLinkMerchantId) {
      notify("error", "Selecione uma operação / merchant para criar o link.");
      return;
    }
    const cleanTitle = newPaymentLinkTitle.trim();
    if (!cleanTitle) {
      notify("error", "Informe um título para o link de pagamento.");
      return;
    }
    let amountCents: number | undefined = undefined;
    if (!newPaymentLinkCustom) {
      const cleanAmt = newPaymentLinkAmount.replace(/\./g, "").replace(",", ".").trim();
      const num = parseFloat(cleanAmt);
      if (isNaN(num) || num < 1) {
        notify("error", "O valor fixo deve ser de no mínimo R$ 1,00.");
        return;
      }
      amountCents = Math.round(num * 100);
    }
    if (!newPaymentLinkMethods.length) {
      notify("error", "Selecione ao menos uma forma de pagamento aceita.");
      return;
    }

    setSubmittingAction("create-payment-link");
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedPaymentLinkMerchantId}/payment-links`, {
        method: "POST",
        body: JSON.stringify({
          title: cleanTitle,
          description: newPaymentLinkDesc.trim() || undefined,
          amountCents,
          allowCustomAmount: newPaymentLinkCustom,
          acceptedMethods: newPaymentLinkMethods,
          expiresAt: newPaymentLinkExpiresAt ? new Date(newPaymentLinkExpiresAt).toISOString() : undefined,
          maxUses: newPaymentLinkMaxUses ? parseInt(newPaymentLinkMaxUses, 10) : undefined,
        }),
      });

      if (res?.link) {
        notify("success", "Link de pagamento autônomo gerado com sucesso!");
        setPaymentLinkModal(false);
        setNewPaymentLinkTitle("");
        setNewPaymentLinkDesc("");
        setNewPaymentLinkAmount("");
        setNewPaymentLinkCustom(false);
        setNewPaymentLinkExpiresAt("");
        setNewPaymentLinkMaxUses("");
        const publicUrl = `https://pay.axionenterprise.cloud/p/${res.link.id}`;
        setCreatedLinkUrlModal({ id: res.link.id, url: publicUrl, title: res.link.title });
        await loadPaymentLinks(selectedPaymentLinkMerchantId);
      } else {
        notify("error", res?.error || "Não foi possível criar o link de pagamento.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleDeletePaymentLink = async (linkId: string) => {
    if (!selectedPaymentLinkMerchantId) return;
    setSubmittingAction(`delete-link-${linkId}`);
    try {
      const res = await apiFetch(`/v1/dashboard/merchants/${selectedPaymentLinkMerchantId}/payment-links/${linkId}`, {
        method: "DELETE",
      });
      if (res?.success) {
        notify("success", "Link de pagamento removido com sucesso.");
        setPaymentLinks((prev) => prev.filter((l) => l.id !== linkId));
      } else {
        notify("error", res?.error || "Erro ao excluir o link.");
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  // Se carregando autenticação
  if (authLoading) {
    return (
      <div className="pay-workspace min-h-screen bg-[#040806] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#00e66b] animate-spin" />
          <span className="text-xs font-mono text-[#a1b0a6]">Verificando sessão segura AXION...</span>
        </div>
      </div>
    );
  }

  // Falha Fechada (Fail-Closed): Se não logado, exibe tela de login oficial AXION Auth
  if (!user) {
    const returnUrl = encodeURIComponent(window.location.href);
    return (
      <div className="pay-workspace min-h-screen bg-[#040806] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#09120d]/90 border border-[#213428] shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#00e66b]/10 border border-[#00e66b]/20 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-[#00e66b]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Painel de Controle AxionPay</h2>
            <p className="text-xs text-[#a1b0a6] leading-relaxed">
              Autenticação obrigatória. Faça login com sua conta corporativa AXION para acessar o gateway industrial.
            </p>
          </div>
          <a
            href={`${AUTH_API}/login?return_to=${returnUrl}`}
            className="w-full py-3.5 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar com AXION Single Sign-On</span>
          </a>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Visão Geral", icon: BarChart3, path: "/dashboard" },
    { id: "merchants", label: "Merchants & Operações", icon: Building2, path: "/dashboard/merchants" },
    { id: "api-keys", label: "Chaves de API", icon: Key, path: "/dashboard/api-keys" },
    { id: "webhooks", label: "Webhooks", icon: Webhook, path: "/dashboard/webhooks" },
    { id: "payment-links", label: "Links de Pagamento", icon: Link2, path: "/dashboard/payment-links" },
    { id: "whatsapp", label: "Régua WhatsApp", icon: MessageSquare, path: "/dashboard/whatsapp" },
    { id: "api-logs", label: "Logs de API", icon: Terminal, path: "/dashboard/api-logs" },
    { id: "subscriptions", label: "Assinaturas & Portal", icon: Users, path: "/dashboard/subscriptions" },
    { id: "transactions", label: "Transações", icon: Wallet, path: "/dashboard/transactions" },
    { id: "payouts", label: "Saques & Saldos", icon: Banknote, path: "/dashboard/payouts" },
    { id: "onboarding", label: "Cadastro & KYC", icon: FileCheck2, path: "/dashboard/onboarding" },
    ...(canReviewKyc ? [{ id: "kyc-review", label: "Análise KYC", icon: Shield, path: "/dashboard/kyc-review" }] : []),
    { id: "billing", label: "Plano & Cobrança", icon: CreditCard, path: "/dashboard/billing" },
    { id: "integrations", label: "Integrações", icon: Globe, path: "/dashboard/integrations" },
    { id: "settings", label: "Configurações", icon: Settings, path: "/dashboard/settings" },
  ];
  const canGenerateApiKeys = onboarding?.status === "APPROVED";

  return (
    <div className="pay-workspace min-h-screen bg-[#040806] text-[#f3f7f4] font-sans antialiased flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 h-screen bg-[#09120d] border-r border-[#213428]/80 z-40 flex flex-col justify-between transition-all duration-300 ${
          mobileOpen ? "left-0 w-64" : "-left-64 md:left-0"
        } ${collapsed ? "md:w-16" : "md:w-64"}`}
      >
        <div>
          <div className="flex items-center justify-between px-5 h-16 border-b border-[#213428]/80">
            {(!collapsed || mobileOpen) ? (
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center overflow-hidden shadow-sm shadow-emerald-500/20">
                  <img src="/axionpay_logo.png" className="h-8 w-8 object-contain p-0.5" alt="AXION Pay" />
                </div>
                <span className="text-base font-semibold tracking-tight text-white">
                  AXION <span className="text-[#00e66b]">Pay</span>
                </span>
              </Link>
            ) : (
              <Link to="/dashboard" className="mx-auto flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center overflow-hidden shadow-sm shadow-emerald-500/20">
                  <img src="/axionpay_logo.png" className="h-8 w-8 object-contain p-0.5" alt="AXION Pay" />
                </div>
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 text-[#a1b0a6] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === item.id
                    ? "bg-[#00e66b] text-black shadow-lg shadow-emerald-500/10"
                    : "text-[#a1b0a6] hover:text-white hover:bg-[#101d14]"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Card no rodapé da Sidebar */}
        <div className="p-4 border-t border-[#213428]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#182b20] flex items-center justify-center text-white font-bold text-xs">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "AX"}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.name || "Usuário AXION"}</p>
                <p className="text-[10px] font-mono text-[#8b9f93] truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={async () => {
                await clearAuth();
                window.location.reload();
              }}
              title="Sair"
              className="p-1.5 text-[#8b9f93] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-16 px-6 border-b border-[#213428]/80 flex items-center justify-between bg-[#040806]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {canReviewKyc && (
              <a
                href="https://admin.pay.axionenterprise.cloud"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#30513d] bg-[#101d14] px-3 py-1.5 text-xs font-bold text-[#69f0ae] hover:bg-[#182b20]"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin financeiro
              </a>
            )}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-[#a1b0a6] hover:text-white hover:bg-[#101d14]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="px-3 py-1.5 rounded-lg border border-[#213428] bg-[#101d14] hover:bg-[#182b20] text-xs text-[#b5c6bb] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
            <a
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-[#00e66b]/10 border border-[#00e66b]/30 text-[#00e66b] hover:bg-[#00e66b]/20 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal da API</span>
            </a>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">
          {onboardingLoaded && onboarding?.status !== "APPROVED" && (
            <button
              type="button"
              onClick={() => setActiveSection("onboarding")}
              className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition hover:border-amber-400/60"
            >
              <span className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold text-white">Conclua o cadastro e a verificação KYC</span>
                  <span className="mt-0.5 block text-xs text-amber-100/80">Chaves de API e cobranças ficam protegidas até a aprovação da organização.</span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 text-amber-300" aria-hidden="true" />
              </span>
            </button>
          )}
          {/* TAB 1: VISÃO GERAL (OVERVIEW) */}
          {activeSection === "overview" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">Visão Geral do Gateway</h1>
                  <p className="text-xs text-[#a1b0a6] mt-1">Métricas em tempo real confirmadas no banco PostgreSQL</p>
                </div>
                <button
                  onClick={() => setMerchantModal(true)}
                  className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Merchant</span>
                </button>
              </div>

              {/* Grid de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Operações (Merchants)</span>
                  <div className="text-3xl font-semibold text-white">{overview.merchants}</div>
                  <p className="text-[11px] text-[#a1b0a6]">Contas ativas vinculadas</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Chaves de API Ativas</span>
                  <div className="text-3xl font-semibold text-[#00e66b]">{overview.activeKeys}</div>
                  <p className="text-[11px] text-[#a1b0a6]">Credenciais com hash SHA-256</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Transações Hoje</span>
                  <div className="text-3xl font-semibold text-white">{overview.transactionsToday}</div>
                  <p className="text-[11px] text-[#a1b0a6]">Cobranças emitidas hoje</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Volume no Mês</span>
                  <div className="text-3xl font-semibold text-emerald-400 font-mono">
                    R$ {(overview.volumeMonthCents / 100).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-[#a1b0a6]">Liquidação comprovada</p>
                </div>
              </div>

              {/* Tabela de Transações Recentes */}
              <div className="rounded-3xl bg-[#09120d] border border-[#213428]/80 p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white tracking-tight">Transações Recentes</h3>
                  <button
                    onClick={() => setActiveSection("transactions")}
                    className="text-xs text-[#00e66b] hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <p className="text-xs font-mono text-[#8b9f93]">Ainda não há transações nesta organização.</p>
                    <button type="button" onClick={() => setActiveSection("merchants")} className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-3 py-2 text-xs font-bold text-[#69f0ae] transition hover:bg-[#182b20]"><Building2 className="h-4 w-4" aria-hidden="true" />Cadastrar merchant</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#213428] text-[#8b9f93] font-mono text-[10px] uppercase">
                          <th className="pb-3">ID / Correlation</th>
                          <th className="pb-3">Merchant</th>
                          <th className="pb-3">Valor</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {transactions.slice(0, 5).map((tx) => (
                          <tr key={tx.id} className="hover:bg-[#101d14]/50 transition">
                            <td className="py-3 font-mono text-[#b5c6bb] select-all">{tx.correlationId}</td>
                            <td className="py-3 font-semibold text-white">{tx.merchantName}</td>
                            <td className="py-3 font-mono font-bold text-white">
                              R$ {(tx.amountCents / 100).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={tx.status} />
                            </td>
                            <td className="py-3 text-[#a1b0a6] font-mono">
                              {new Date(tx.createdAt).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MERCHANTS & OPERAÇÕES */}
          {activeSection === "merchants" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Merchants & Contas Operacionais</h1>
                  <p className="text-xs text-[#a1b0a6] mt-0.5">Segregação multi-tenant de cobranças e chaves de API</p>
                </div>
                <button
                  onClick={() => setMerchantModal(true)}
                  className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Merchant</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {merchants.length === 0 ? (
                  <div className="col-span-full flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-[#30513d] bg-[#09120d] p-8 text-center">
                    <Building2 className="h-8 w-8 text-[#69f0ae]" aria-hidden="true" />
                    <h2 className="mt-4 text-base font-bold text-white">Crie sua primeira conta operacional</h2>
                    <p className="mt-2 max-w-md text-xs leading-5 text-[#a1b0a6]">Cada merchant separa cobranças, permissões e chaves da sua operação.</p>
                    <button type="button" onClick={() => setMerchantModal(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae]"><Plus className="h-4 w-4" aria-hidden="true" />Cadastrar primeiro merchant</button>
                  </div>
                ) : merchants.map((m) => (
                  <div
                    key={m.id}
                    className="p-6 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-4 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#101d14] border border-[#213428] flex items-center justify-center">
                          <Building className="w-5 h-5 text-[#00e66b]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{m.name}</h4>
                          <span className="text-[10px] font-mono text-[#8b9f93] select-all">{m.id}</span>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="space-y-1 text-xs text-[#a1b0a6] font-mono">
                      {m.document && <p>Documento: {m.document}</p>}
                      {m.billingEmail && <p>E-mail: {m.billingEmail}</p>}
                    </div>

                    <div className="pt-3 border-t border-[#213428] flex justify-between items-center text-xs">
                      <button
                        onClick={() => {
                          if (!canGenerateApiKeys) {
                            setActiveSection("onboarding");
                            notify("info", "Conclua o KYC antes de gerar chaves de API.");
                            return;
                          }
                          setKeyMerchantId(m.id);
                          setApiKeyModal(true);
                        }}
                        className="text-[#00e66b] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{canGenerateApiKeys ? "Gerar Chave de API" : "Concluir KYC"}</span>
                      </button>

                      <button
                        onClick={() => handleToggleMerchantStatus(m.id, m.status)}
                        className="text-xs text-[#a1b0a6] hover:text-white cursor-pointer"
                      >
                        {m.status === "ACTIVE" ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS */}
          {activeSection === "api-keys" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Chaves de API (Server-to-Server)</h1>
                  <p className="text-xs text-[#a1b0a6] mt-0.5">Credenciais criptografadas para emissão de cobranças PIX</p>
                </div>
                <button
                  onClick={() => {
                    if (!canGenerateApiKeys) {
                      setActiveSection("onboarding");
                      notify("info", "Conclua o KYC antes de gerar chaves de API.");
                      return;
                    }
                    if (merchants.length > 0) setKeyMerchantId(merchants[0].id);
                    setApiKeyModal(true);
                  }}
                  className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{canGenerateApiKeys ? "Nova Chave de API" : "Concluir KYC"}</span>
                </button>
              </div>

              <div className="rounded-3xl bg-[#09120d] border border-[#213428]/80 p-6 space-y-4 shadow-xl">
                {apiKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <p className="text-xs font-mono text-[#8b9f93]">Nenhuma chave de API ativa nesta organização.</p>
                    <button type="button" onClick={() => {
                      if (!canGenerateApiKeys) {
                        setActiveSection("onboarding");
                        return;
                      }
                      if (!merchants.length) {
                        setMerchantModal(true);
                        notify("info", "Cadastre um merchant antes de gerar a chave de API.");
                        return;
                      }
                      setKeyMerchantId(merchants[0].id);
                      setApiKeyModal(true);
                    }} className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-3 py-2 text-xs font-bold text-[#69f0ae] transition hover:bg-[#182b20]"><Key className="h-4 w-4" aria-hidden="true" />{canGenerateApiKeys && merchants.length ? "Gerar chave" : canGenerateApiKeys ? "Cadastrar merchant" : "Concluir KYC"}</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#213428] text-[#8b9f93] font-mono text-[10px] uppercase">
                          <th className="pb-3">Nome da Chave</th>
                          <th className="pb-3">Merchant</th>
                          <th className="pb-3">Prefixo</th>
                          <th className="pb-3">Escopos</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {apiKeys.map((k) => (
                          <tr key={k.id} className="hover:bg-[#101d14]/50 transition">
                            <td className="py-3 font-bold text-white">{k.name}</td>
                            <td className="py-3 text-[#a1b0a6]">{k.merchantName}</td>
                            <td className="py-3 font-mono text-[#b5c6bb]">{k.keyPrefix}...</td>
                            <td className="py-3 font-mono text-[11px] text-[#a1b0a6]">
                              {(k.scopes || []).join(", ")}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={k.status} />
                            </td>
                            <td className="py-3 text-right">
                              {k.status === "ACTIVE" && (
                                <button
                                  onClick={() => setPendingRevoke({ id: k.id, name: k.name })}
                                  className="text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer"
                                >
                                  Revogar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TRANSAÇÕES */}
          {activeSection === "transactions" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Histórico de Transações</h1>
                <p className="text-xs text-[#a1b0a6] mt-0.5">Todas as intenções de pagamento registradas no PostgreSQL</p>
              </div>

              <div className="rounded-3xl bg-[#09120d] border border-[#213428]/80 p-6 space-y-4 shadow-xl">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <p className="text-xs font-mono text-[#8b9f93]">Nenhuma transação registrada até o momento.</p>
                    <a href="/docs" className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-3 py-2 text-xs font-bold text-[#69f0ae] transition hover:bg-[#182b20]"><Terminal className="h-4 w-4" aria-hidden="true" />Ver integração da API</a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#213428] text-[#8b9f93] font-mono text-[10px] uppercase">
                          <th className="pb-3">Correlation ID</th>
                          <th className="pb-3">Merchant</th>
                          <th className="pb-3">Valor</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Provedor</th>
                          <th className="pb-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[#101d14]/50 transition">
                            <td className="py-3 font-mono text-[#b5c6bb] select-all">{tx.correlationId}</td>
                            <td className="py-3 font-semibold text-white">{tx.merchantName}</td>
                            <td className="py-3 font-mono font-bold text-[#00e66b]">
                              R$ {(tx.amountCents / 100).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={tx.status} />
                            </td>
                            <td className="py-3 font-mono text-[#a1b0a6]">{tx.provider}</td>
                            <td className="py-3 text-[#a1b0a6] font-mono">
                              {new Date(tx.createdAt).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SAQUES & SALDOS */}
          {activeSection === "payouts" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">Saques & Saldos</h1>
                  <p className="text-xs text-[#a1b0a6] mt-1">Gestão de saldo líquido disponível, retenções de prazos e resgates em tempo real via Pix</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPixKeyModal(true)}
                    className="px-3.5 py-2 bg-[#101d14] hover:bg-[#182b20] border border-[#30513d] text-[#b5c6bb] hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-[#00e66b]" />
                    <span>{balances?.pixKey ? "Alterar Chave Pix" : "Cadastrar Chave Pix"}</span>
                  </button>
                  <button
                    onClick={() => setPayoutModal(true)}
                    disabled={!balances || balances.availableBalanceCents < 1000}
                    className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Solicitar Saque Pix</span>
                  </button>
                </div>
              </div>

              {/* Grid de Saldos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Saldo Disponível */}
                <div className="p-5 rounded-2xl bg-[#09120d] border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00e66b]">Saldo Disponível</span>
                    <Banknote className="w-4 h-4 text-[#00e66b]" />
                  </div>
                  <div className="text-3xl font-semibold text-white">
                    R$ {((balances?.availableBalanceCents ?? 0) / 100).toFixed(2).replace(".", ",")}
                  </div>
                  <p className="text-[11px] text-emerald-300/80">Liberado para transferência imediata via Pix</p>
                </div>

                {/* Saldo a Liberar */}
                <div className="p-5 rounded-2xl bg-[#09120d] border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">Saldo a Liberar</span>
                    <CalendarClock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-semibold text-white">
                    R$ {((balances?.pendingBalanceCents ?? 0) / 100).toFixed(2).replace(".", ",")}
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Prazo Pix: D+{balances?.rates?.settlementDaysPix ?? 0} · Cartão: D+{balances?.rates?.settlementDaysCard ?? 14}
                  </p>
                </div>

                {/* Total Já Sacado */}
                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Total Já Transferido</span>
                    <Coins className="w-4 h-4 text-[#8b9f93]" />
                  </div>
                  <div className="text-3xl font-semibold text-white">
                    R$ {((balances?.totalPaidOutCents ?? 0) / 100).toFixed(2).replace(".", ",")}
                  </div>
                  <p className="text-[11px] text-[#a1b0a6]">Saques liquidados com sucesso</p>
                </div>

                {/* Chave Pix de Recebimento */}
                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Chave de Destino</span>
                    <Key className="w-4 h-4 text-[#8b9f93]" />
                  </div>
                  <div className="text-sm font-mono font-semibold text-white truncate">
                    {balances?.pixKey ? (
                      <span className="text-emerald-400">{balances.pixKey}</span>
                    ) : (
                      <span className="text-[#a1b0a6] text-xs">Nenhuma chave cadastrada</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#a1b0a6]">
                    {balances?.pixKeyType ? `Tipo: ${balances.pixKeyType}` : "Clique em 'Cadastrar Chave Pix'"}
                  </p>
                </div>
              </div>

              {/* Tabela de Histórico de Saques */}
              <div className="rounded-3xl bg-[#09120d] border border-[#213428]/80 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white tracking-tight">Histórico de Saques & Transferências</h3>
                  <span className="text-[11px] font-mono text-[#8b9f93]">{payouts.length} registro(s)</span>
                </div>

                {payouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Banknote className="w-8 h-8 text-[#8b9f93] opacity-40" />
                    <p className="text-xs font-mono text-[#8b9f93]">Nenhum saque solicitado até o momento.</p>
                    {balances && balances.availableBalanceCents >= 1000 && (
                      <button
                        onClick={() => setPayoutModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-3 py-2 text-xs font-bold text-[#69f0ae] transition hover:bg-[#182b20] cursor-pointer"
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        Solicitar primeiro saque
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#213428] text-[#8b9f93] font-mono text-[10px] uppercase">
                          <th className="pb-3">Data / Hora</th>
                          <th className="pb-3">Valor Solicitado</th>
                          <th className="pb-3">Taxa de Saque</th>
                          <th className="pb-3">Valor Líquido</th>
                          <th className="pb-3">Chave Pix</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {payouts.map((p) => (
                          <tr key={p.id} className="hover:bg-[#101d14]/50 transition">
                            <td className="py-3 text-[#a1b0a6] font-mono">
                              {new Date(p.createdAt).toLocaleString("pt-BR")}
                            </td>
                            <td className="py-3 font-semibold text-white">
                              R$ {(p.amountCents / 100).toFixed(2).replace(".", ",")}
                            </td>
                            <td className="py-3 font-mono text-[#a1b0a6]">
                              R$ {(p.feeCents / 100).toFixed(2).replace(".", ",")}
                            </td>
                            <td className="py-3 font-bold text-emerald-400 font-mono">
                              R$ {(p.netAmountCents / 100).toFixed(2).replace(".", ",")}
                            </td>
                            <td className="py-3 font-mono text-xs text-[#d4e7da]">
                              <span className="text-[10px] text-[#8b9f93] uppercase mr-1">[{p.pixKeyType}]</span>
                              {p.pixKey}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CADASTRO E KYC */}
          {activeSection === "onboarding" && (
            <div className="space-y-6 animate-fadeIn max-w-3xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Cadastro da organização & KYC</h1>
                  <p className="mt-0.5 text-xs text-[#a1b0a6]">Dados usados para abrir sua operação no gateway. O documento completo não é armazenado pelo AXION Pay.</p>
                </div>
                <StatusBadge status={onboarding?.status || "DRAFT"} />
              </div>

              {onboarding?.status === "SUBMITTED" || onboarding?.status === "IN_REVIEW" ? (
                <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 text-sm text-sky-100">
                  <div className="flex gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
                    <div>
                      <p className="font-bold">Sua solicitação está em revisão.</p>
                      <p className="mt-1 text-xs leading-5 text-sky-100/80">A ativação de chaves só ocorre após a decisão de KYC. Não envie documentos por e-mail ou chat.</p>
                    </div>
                  </div>
                </div>
              ) : onboarding?.status === "APPROVED" ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <div>
                      <p className="font-bold">Organização aprovada para operar.</p>
                      <p className="mt-1 text-xs leading-5 text-emerald-100/80">Você já pode gerar chaves de API para merchants ativos.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveOnboarding} className="space-y-5 rounded-3xl border border-[#213428]/80 bg-[#09120d] p-6 shadow-xl">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Tipo de cadastro</label>
                      <select
                        value={onboardingForm.legalEntityType}
                        onChange={(e) => updateOnboardingField("legalEntityType", e.target.value as OnboardingForm["legalEntityType"])}
                        className="w-full rounded-xl border border-[#213428] bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none"
                      >
                        <option value="BUSINESS">Pessoa jurídica</option>
                        <option value="INDIVIDUAL">Pessoa física</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">País</label>
                      <input value={onboardingForm.countryCode} maxLength={2} onChange={(e) => updateOnboardingField("countryCode", e.target.value.toUpperCase())} className="w-full rounded-xl border border-[#213428] bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">{onboardingForm.legalEntityType === "BUSINESS" ? "Razão social" : "Nome completo"} <span className="text-[#00e66b]">*</span></label>
                      <input value={onboardingForm.legalName} onChange={(e) => updateOnboardingField("legalName", e.target.value)} aria-invalid={Boolean(kycFieldErrors.legalName)} className={`w-full rounded-xl border bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none ${kycFieldErrors.legalName ? "border-red-400" : "border-[#213428]"}`} />
                      {kycFieldErrors.legalName && <p className="mt-1 text-[11px] text-red-300">{kycFieldErrors.legalName}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Nome fantasia (opcional)</label>
                      <input value={onboardingForm.tradingName} onChange={(e) => updateOnboardingField("tradingName", e.target.value)} className="w-full rounded-xl border border-[#213428] bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">{onboardingForm.legalEntityType === "INDIVIDUAL" ? "CPF" : "CNPJ"} <span className="text-[#00e66b]">*</span></label>
                      <input inputMode="numeric" value={onboardingForm.documentNumber} onChange={(e) => updateOnboardingField("documentNumber", formatDocument(e.target.value))} placeholder={onboardingForm.legalEntityType === "INDIVIDUAL" ? "000.000.000-00" : "00.000.000/0000-00"} aria-invalid={Boolean(kycFieldErrors.documentNumber)} className={`w-full rounded-xl border bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none ${kycFieldErrors.documentNumber ? "border-red-400" : "border-[#213428]"}`} />
                      {kycFieldErrors.documentNumber ? <p className="mt-1 text-[11px] text-red-300">{kycFieldErrors.documentNumber}</p> : <p className="mt-1 text-[11px] text-[#8b9f93]">Formato automático. O número completo não é armazenado.</p>}
                      {onboarding?.documentLastFour && <p className="mt-1 text-[11px] text-[#8b9f93]">Documento salvo com final {onboarding.documentLastFour}.</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Telefone <span className="text-[#00e66b]">*</span></label>
                      <input type="tel" inputMode="tel" value={onboardingForm.phoneE164} onChange={(e) => updateOnboardingField("phoneE164", formatPhone(e.target.value, onboardingForm.countryCode))} placeholder="+55 (11) 99999-9999" aria-invalid={Boolean(kycFieldErrors.phoneE164)} className={`w-full rounded-xl border bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none ${kycFieldErrors.phoneE164 ? "border-red-400" : "border-[#213428]"}`} />
                      {kycFieldErrors.phoneE164 && <p className="mt-1 text-[11px] text-red-300">{kycFieldErrors.phoneE164}</p>}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">E-mail financeiro <span className="text-[#00e66b]">*</span></label>
                      <input type="text" inputMode="email" value={onboardingForm.billingEmail} onChange={(e) => updateOnboardingField("billingEmail", e.target.value)} aria-invalid={Boolean(kycFieldErrors.billingEmail)} className={`w-full rounded-xl border bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none ${kycFieldErrors.billingEmail ? "border-red-400" : "border-[#213428]"}`} />
                      {kycFieldErrors.billingEmail && <p className="mt-1 text-[11px] text-red-300">{kycFieldErrors.billingEmail}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Site (opcional)</label>
                      <input type="text" inputMode="url" value={onboardingForm.websiteUrl} onChange={(e) => updateOnboardingField("websiteUrl", e.target.value)} placeholder="https://" aria-invalid={Boolean(kycFieldErrors.websiteUrl)} className={`w-full rounded-xl border bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none ${kycFieldErrors.websiteUrl ? "border-red-400" : "border-[#213428]"}`} />
                      {kycFieldErrors.websiteUrl && <p className="mt-1 text-[11px] text-red-300">{kycFieldErrors.websiteUrl}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Atividade e uso previsto do gateway <span className="text-[#00e66b]">*</span></label>
                    <textarea maxLength={1000} value={onboardingForm.businessDescription} onChange={(e) => updateOnboardingField("businessDescription", e.target.value)} aria-invalid={Boolean(kycFieldErrors.businessDescription)} className={`min-h-28 w-full rounded-xl border bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none ${kycFieldErrors.businessDescription ? "border-red-400" : "border-[#213428]"}`} />
                    {kycFieldErrors.businessDescription ? <p className="mt-1 text-[11px] text-red-300">{kycFieldErrors.businessDescription}</p> : <p className="mt-1 text-[11px] text-[#8b9f93]">Ex.: “Cursos online e vendas por PIX”.</p>}
                  </div>
                  <div className="space-y-3 rounded-2xl border border-[#213428] bg-[#050c08]/60 p-4 text-xs text-[#b5c6bb]">
                    <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={onboardingForm.acceptTerms} onChange={(e) => updateOnboardingField("acceptTerms", e.target.checked)} className="mt-0.5" /><span>Aceito os termos de uso do gateway e confirmo que possuo poderes para cadastrar esta operação.</span></label>
                    {kycFieldErrors.acceptTerms && <p className="text-[11px] text-red-300">{kycFieldErrors.acceptTerms}</p>}
                    <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={onboardingForm.acceptPrivacy} onChange={(e) => updateOnboardingField("acceptPrivacy", e.target.checked)} className="mt-0.5" /><span>Li a política de privacidade e autorizo o tratamento dos dados estritamente para prevenção a fraude, compliance e KYC.</span></label>
                    {kycFieldErrors.acceptPrivacy && <p className="text-[11px] text-red-300">{kycFieldErrors.acceptPrivacy}</p>}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button type="submit" disabled={submittingAction === "onboarding-save"} className="rounded-xl border border-[#30513d] bg-[#182b20] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#294333] disabled:cursor-wait disabled:opacity-60">{submittingAction === "onboarding-save" ? "Salvando…" : "Salvar cadastro"}</button>
                    <button type="button" onClick={handleSubmitOnboarding} disabled={submittingAction === "onboarding-submit"} className="rounded-xl bg-[#00e66b] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae] disabled:cursor-wait disabled:opacity-60">{submittingAction === "onboarding-submit" ? "Enviando…" : "Enviar para revisão KYC"}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeSection === "kyc-review" && canReviewKyc && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Fila de análise KYC</h1>
                  <p className="mt-0.5 text-xs text-[#a1b0a6]">Somente dados minimizados são exibidos. Cada decisão gera trilha de auditoria.</p>
                </div>
                <button type="button" onClick={loadAllData} disabled={loadingData} className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-3 py-2 text-xs font-bold text-[#d4e7da] transition hover:bg-[#182b20] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} aria-hidden="true" />Atualizar</button>
              </div>
              <div className="overflow-x-auto rounded-3xl border border-[#213428]/80 bg-[#09120d] p-2 shadow-xl">
                {kycApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                    <p className="text-xs font-mono text-[#8b9f93]">Não há solicitações KYC pendentes.</p>
                    <button type="button" onClick={() => setActiveSection("overview")} className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-3 py-2 text-xs font-bold text-[#69f0ae] transition hover:bg-[#182b20]"><BarChart3 className="h-4 w-4" aria-hidden="true" />Ver visão geral</button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-[#213428] text-[10px] font-mono uppercase tracking-wider text-[#8b9f93]"><th className="px-4 py-3">Titular</th><th className="px-4 py-3">Organização</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Enviado</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {kycApplications.map((application) => (
                        <tr key={application.authUserId} className="transition hover:bg-[#101d14]/60">
                          <td className="px-4 py-3"><p className="font-bold text-white">{application.userDisplayName || "Titular AXION"}</p><p className="mt-0.5 text-[#8b9f93]">{application.userEmail}</p></td>
                          <td className="px-4 py-3 text-[#d4e7da]">{application.legalName}</td>
                          <td className="px-4 py-3 font-mono text-[#a1b0a6]">•••• {application.documentLastFour}</td>
                          <td className="px-4 py-3 text-[#a1b0a6]">{application.submittedAt ? new Date(application.submittedAt).toLocaleString("pt-BR") : "—"}</td>
                          <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setKycReviewModal(application); setKycReviewStatus("IN_REVIEW"); setKycReviewReason(""); }} className="rounded-lg border border-[#00e66b]/40 px-3 py-1.5 text-xs font-bold text-[#00e66b] transition hover:bg-[#00e66b]/10">Analisar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeSection === "kyc-review" && !canReviewKyc && (
            <div className="rounded-3xl border border-[#30513d] bg-[#09120d] p-10 text-center space-y-4">
              <Shield className="mx-auto h-10 w-10 text-amber-300" />
              <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
              <p className="text-xs text-[#a1b0a6] max-w-md mx-auto">
                A fila de análise KYC é reservada a operadores financeiros e compliance da AXION.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection("overview")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-4 py-2 text-xs font-bold text-[#69f0ae] transition hover:bg-[#182b20]"
              >
                <BarChart3 className="h-4 w-4" />
                Voltar à Visão Geral
              </button>
            </div>
          )}

          {/* TAB 6: PLANO E COBRANÇA */}
          {activeSection === "billing" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Plano & cobrança</h1>
                <p className="mt-0.5 text-xs text-[#a1b0a6]">A assinatura é concluída no checkout seguro AXION Pay. O portal não recebe dados brutos do cartão.</p>
              </div>
              <div className="rounded-3xl border border-[#213428]/80 bg-[#09120d] p-6 shadow-xl">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-[#00e66b]/30 bg-[#00e66b]/10 p-2.5"><CreditCard className="h-5 w-5 text-[#00e66b]" aria-hidden="true" /></div>
                    <div>
                      <p className="text-sm font-bold text-white">Assinatura do gateway</p>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-[#a1b0a6]">Checkout, cobrança recorrente, cancelamento e atualização de pagamento são processados pelo AXION Pay com confirmação por eventos assinados.</p>
                    </div>
                  </div>
                  <StatusBadge status={billing?.subscription_status || "NOT_SUBSCRIBED"} />
                </div>
                <div className="mt-6 grid gap-3 border-t border-[#213428] pt-5 sm:grid-cols-2">
                  <div><p className="text-[10px] font-mono uppercase tracking-wider text-[#8b9f93]">Plano</p><p className="mt-1 text-sm text-[#d4e7da]">{billing?.price_id || "Nenhum plano ativo"}</p></div>
                  <div><p className="text-[10px] font-mono uppercase tracking-wider text-[#8b9f93]">Próximo ciclo</p><p className="mt-1 text-sm text-[#d4e7da]">{billing?.current_period_end ? new Date(billing.current_period_end).toLocaleDateString("pt-BR") : "—"}</p></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={handleBillingCheckout} disabled={submittingAction === "billing-checkout"} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae] disabled:cursor-wait disabled:opacity-60"><CreditCard className="h-4 w-4" aria-hidden="true" />{submittingAction === "billing-checkout" ? "Abrindo checkout…" : "Assinar plano"}</button>
                  <button type="button" onClick={handleBillingPortal} disabled={submittingAction === "billing-portal"} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl border border-[#30513d] bg-[#101d14] px-4 py-2.5 text-xs font-bold text-[#d4e7da] transition hover:bg-[#182b20] disabled:cursor-wait disabled:opacity-60"><Settings className="h-4 w-4" aria-hidden="true" />{submittingAction === "billing-portal" ? "Abrindo portal…" : "Gerenciar assinatura"}</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INTEGRAÇÕES & WEBHOOKS */}
          {(activeSection === "integrations" || activeSection === "webhooks") && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {activeSection === "webhooks" ? "Webhooks por Merchant" : "Integrações & Webhooks"}
                  </h1>
                  <p className="text-xs text-[#a1b0a6] mt-0.5">
                    Notificações em tempo real com assinatura HMAC-SHA256 e parâmetros de conexão industrial
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedWebhookMerchantId) loadWebhooks(selectedWebhookMerchantId);
                    }}
                    disabled={loadingWebhooks}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#213428] bg-[#09120d] px-3.5 py-2.5 text-xs font-semibold text-[#a1b0a6] hover:text-white transition hover:border-[#30513d] disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingWebhooks ? "animate-spin text-[#00e66b]" : ""}`} />
                    Atualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!merchants.length) {
                        notify("info", "Cadastre um merchant antes de adicionar webhooks.");
                        return;
                      }
                      setWebhookModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae] shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Webhook
                  </button>
                </div>
              </div>

              {/* Subtabs de Navegação */}
              {activeSection === "integrations" && (
                <div className="flex border-b border-[#213428] gap-6">
                  <button
                    type="button"
                    onClick={() => setWebhookTab("webhooks")}
                    className={`pb-3 text-xs font-bold transition relative flex items-center gap-2 cursor-pointer ${
                      webhookTab === "webhooks"
                        ? "text-[#00e66b] border-b-2 border-[#00e66b]"
                        : "text-[#a1b0a6] hover:text-white"
                    }`}
                  >
                    <Webhook className="w-4 h-4" />
                    Webhooks por Merchant
                    {webhooks.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                        {webhooks.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebhookTab("endpoints")}
                    className={`pb-3 text-xs font-bold transition relative flex items-center gap-2 cursor-pointer ${
                      webhookTab === "endpoints"
                        ? "text-[#00e66b] border-b-2 border-[#00e66b]"
                        : "text-[#a1b0a6] hover:text-white"
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Endpoints da API & Status
                  </button>
                </div>
              )}

              {/* CONTEÚDO 1: WEBHOOKS POR MERCHANT */}
              {(activeSection === "webhooks" || webhookTab === "webhooks") && (
                <div className="space-y-6">
                  {/* Seletor de Merchant / Operação Ativa */}
                  <div className="p-4 rounded-2xl bg-[#09120d] border border-[#213428] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b9f93] block">
                          Operação / Merchant Ativo
                        </span>
                        {merchants.length > 0 ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <select
                              value={selectedWebhookMerchantId}
                              onChange={(e) => setSelectedWebhookMerchantId(e.target.value)}
                              className="bg-[#050c08] border border-[#213428] rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:border-[#00e66b] focus:outline-none cursor-pointer"
                            >
                              {merchants.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.document ? `• ${m.document}` : ""}
                                </option>
                              ))}
                            </select>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Ativo
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-300">Nenhum merchant cadastrado</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#a1b0a6]">
                      <span className="flex items-center gap-1.5 font-mono">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        HMAC-SHA256
                      </span>
                      <span className="text-[#213428]">•</span>
                      <span className="font-mono">Timeout: 8s</span>
                      <span className="text-[#213428]">•</span>
                      <span className="font-mono">Zero Mock</span>
                    </div>
                  </div>

                  {/* LISTAGEM DE WEBHOOKS ATIVOS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-[#00e66b]" />
                        Endpoints Cadastrados ({webhooks.length})
                      </h2>
                    </div>

                    {loadingWebhooks && webhooks.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-[#09120d] border border-[#213428] flex items-center justify-center gap-3 text-xs text-[#a1b0a6]">
                        <Loader2 className="w-5 h-5 animate-spin text-[#00e66b]" />
                        Carregando webhooks do merchant...
                      </div>
                    ) : webhooks.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-[#09120d] border border-[#213428]/80 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#00e66b]/10 border border-[#00e66b]/20 flex items-center justify-center mx-auto text-[#00e66b]">
                          <Webhook className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-white">Nenhum webhook cadastrado</h3>
                          <p className="text-xs text-[#a1b0a6] max-w-md mx-auto">
                            Cadastre a URL do seu servidor para receber avisos instantâneos de aprovação de cobranças, cancelamentos e renovações.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!merchants.length) {
                              notify("info", "Cadastre um merchant antes de adicionar webhooks.");
                              return;
                            }
                            setWebhookModal(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae] cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Cadastrar Primeiro Webhook
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {webhooks.map((w) => (
                          <div
                            key={w.id}
                            className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 hover:border-[#30513d] transition space-y-4"
                          >
                            {/* Linha superior: URL, Status e Ações */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ATIVO
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#050c08] border border-[#213428] text-[#a1b0a6]">
                                  {w.url.startsWith("https://") ? "HTTPS" : "HTTP"}
                                </span>
                                <code className="text-xs font-mono text-[#00e66b] bg-[#050c08] px-3 py-1.5 rounded-lg border border-[#213428] select-all break-all">
                                  {w.url}
                                </code>
                              </div>

                              <div className="flex items-center gap-2 self-end lg:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleTestWebhook(w.id)}
                                  disabled={testingWebhookId === w.id}
                                  title="Disparar payload de teste para este webhook"
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50 cursor-pointer"
                                >
                                  {testingWebhookId === w.id ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      Enviando…
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      Testar Disparo
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWebhook(w.id)}
                                  disabled={submittingAction === `del-webhook-${w.id}`}
                                  title="Excluir endpoint"
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {submittingAction === `del-webhook-${w.id}` ? "Removendo…" : "Excluir"}
                                </button>
                              </div>
                            </div>

                            {/* Linha do Secret */}
                            <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b9f93] block">
                                  Chave de Assinatura HMAC (Secret)
                                </span>
                                <code className="text-xs font-mono text-white select-all">
                                  {revealedWebhookSecrets[w.id]
                                    ? w.secret
                                    : w.secret
                                    ? `${w.secret.slice(0, 10)}••••••••••••••••••••••••`
                                    : "whsec_••••••••••••"}
                                </code>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleRevealSecret(w.id)}
                                  className="inline-flex items-center gap-1.5 text-xs text-[#a1b0a6] hover:text-white px-2.5 py-1 rounded-lg bg-[#09120d] border border-[#213428] transition cursor-pointer"
                                >
                                  {revealedWebhookSecrets[w.id] ? (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5" /> Ocultar
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5" /> Revelar
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(w.secret);
                                    notify("success", "Chave secreta copiada para a área de transferência!");
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00e66b] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 transition hover:bg-emerald-500/20 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copiar Secret
                                </button>
                              </div>
                            </div>

                            {/* Eventos inscritos */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b9f93] block">
                                Eventos Inscritos ({w.events?.length || 0}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {w.events?.map((ev: string) => {
                                  const isSuccess = ev.includes("succeeded") || ev.includes("created") || ev.includes("renewed");
                                  return (
                                    <span
                                      key={ev}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                                        isSuccess
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                          : "bg-[#050c08] border-[#213428] text-[#a1b0a6]"
                                      }`}
                                    >
                                      {ev}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="text-[10px] text-[#6b7d72] font-mono border-t border-[#213428]/60 pt-2 flex items-center justify-between">
                              <span>ID: {w.id}</span>
                              <span>Cadastrado em {new Date(w.createdAt).toLocaleString("pt-BR")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TRILHA DE AUDITORIA E ENTREGAS RECENTES */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          Trilha de Auditoria & Entregas Recentes
                        </h2>
                        <p className="text-xs text-[#a1b0a6] mt-0.5">
                          Histórico em tempo real das notificações enviadas com status de recepção do seu servidor.
                        </p>
                      </div>
                    </div>

                    {webhookDeliveries.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-[#09120d] border border-[#213428] text-center text-xs text-[#a1b0a6]">
                        Nenhuma entrega registrada ainda para este merchant. Realize uma transação ou clique em "Testar Disparo" para auditar.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-[#213428] bg-[#09120d]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#050c08] text-[10px] font-mono uppercase text-[#8b9f93] border-b border-[#213428]">
                            <tr>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Evento</th>
                              <th className="px-4 py-3">Tentativas</th>
                              <th className="px-4 py-3">Data / Hora</th>
                              <th className="px-4 py-3 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#213428]">
                            {webhookDeliveries.slice(0, 15).map((d) => {
                              const is2xx = d.statusCode && d.statusCode >= 200 && d.statusCode < 300;
                              const isErr = d.statusCode && d.statusCode >= 400;
                              return (
                                <tr key={d.id} className="hover:bg-[#101d14]/40 transition">
                                  <td className="px-4 py-3">
                                    {is2xx ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {d.statusCode} OK
                                      </span>
                                    ) : isErr ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                        <AlertCircle className="w-3 h-3" />
                                        HTTP {d.statusCode}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                        <Clock className="w-3 h-3" />
                                        {d.error ? "Falha" : "Enviando"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-semibold text-white">
                                      {d.eventType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[#a1b0a6]">
                                    {d.attempts}ª tentativa
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[#a1b0a6]">
                                    {new Date(d.createdAt).toLocaleString("pt-BR")}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setInspectingDelivery(d)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#050c08] border border-[#213428] text-xs font-mono text-[#00e66b] hover:border-[#00e66b] transition cursor-pointer"
                                    >
                                      <Code2 className="w-3.5 h-3.5" />
                                      Ver Payload
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* GUIA DE ASSINATURA CRIPTOGRÁFICA */}
                  <div className="p-6 rounded-2xl bg-[#09120d] border border-[#213428] space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-[#00e66b]" />
                      <h3 className="text-sm font-bold text-white">
                        Como Validar a Assinatura Criptográfica HMAC-SHA256
                      </h3>
                    </div>
                    <p className="text-xs text-[#a1b0a6] leading-relaxed">
                      Cada disparo de webhook inclui o cabeçalho <code className="text-[#00e66b] font-mono">X-Axion-Signature: t=17890...,v1=6a7b...</code>. Para prevenir ataques de repetição e falsificação, compute o HMAC-SHA256 do corpo bruto (<code className="text-white font-mono">rawBody</code>) precedido pelo timestamp.
                    </p>
                    <div className="p-4 rounded-xl bg-[#050c08] border border-[#213428] font-mono text-xs text-[#a1b0a6] space-y-2 overflow-x-auto">
                      <p className="text-emerald-400 font-bold">// Exemplo em Node.js / TypeScript:</p>
                      <pre className="text-white select-all">{`import crypto from 'crypto';

function verifyAxionWebhook(rawBody: string, signatureHeader: string, secret: string): boolean {
  const [tPart, v1Part] = signatureHeader.split(',');
  const timestamp = tPart?.replace('t=', '');
  const expectedHash = v1Part?.replace('v1=', '');
  if (!timestamp || !expectedHash) return false;

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));
}`}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO 2: ENDPOINTS DA API & PARÂMETROS */}
              {activeSection === "integrations" && webhookTab === "endpoints" && (
                <div className="space-y-6">
                  <div className={`rounded-2xl border p-5 ${integrations?.paymentsEnabled ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                    <div className="flex items-start gap-3">
                      {integrations?.paymentsEnabled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
                      <div>
                        <p className="text-sm font-bold text-white">{integrations?.paymentsEnabled ? "PIX operacional" : "PIX aguardando ativação"}</p>
                        <p className="mt-1 text-xs leading-5 text-[#b5c6bb]">
                          {integrations?.paymentsEnabled
                            ? "Infraestrutura AXION Pay ativa. As cobranças podem ser criadas pela API autenticada."
                            : "A criação de cobranças ficará disponível após a ativação segura da operação PIX AXION Pay."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-4">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-[#00e66b]" />
                        <h3 className="text-sm font-bold text-white">Endpoint de Criação de Cobranças</h3>
                      </div>
                      <code className="block p-3 rounded-xl bg-[#050c08] border border-[#213428] text-xs font-mono text-[#00e66b] select-all">
                        POST https://api.axionenterprise.cloud/v1/charges
                      </code>
                      <div className="space-y-2 text-xs text-[#a1b0a6] font-mono">
                        <p>Header: <span className="text-white">Idempotency-Key: &lt;uuid&gt;</span></p>
                        <p>Header: <span className="text-white">Authorization: Bearer axp_live_...</span></p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-4">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">Endpoint de Consulta de Cobrança</h3>
                      </div>
                      <code className="block p-3 rounded-xl bg-[#050c08] border border-[#213428] text-xs font-mono text-emerald-400 select-all">
                        GET https://api.axionenterprise.cloud/v1/charges/&#123;correlationId&#125;
                      </code>
                      <div className="space-y-2 text-xs text-[#a1b0a6] font-mono">
                        <p>Header: <span className="text-white">Authorization: Bearer axp_live_...</span></p>
                        <p>Resposta: <span className="text-white">Status conciliado em tempo real</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          
          {/* TAB: LINKS DE PAGAMENTO AUTÔNOMOS */}
          {activeSection === "payment-links" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                    <Link2 className="w-6 h-6 text-[#00e66b]" />
                    <span>Links de Pagamento Autônomos</span>
                  </h1>
                  <p className="text-xs text-[#a1b0a6] mt-1">
                    Gere links públicos compartilháveis para vender sem precisar de site ou plataforma própria.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {merchants.length > 1 && (
                    <div className="flex items-center gap-2 bg-[#09120d] border border-[#213428] rounded-xl px-3 py-1.5 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-[#00e66b]" />
                      <select
                        value={selectedPaymentLinkMerchantId}
                        onChange={(e) => setSelectedPaymentLinkMerchantId(e.target.value)}
                        className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                      >
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#09120d] text-white">
                            {m.tradingName || m.legalName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!merchants.length) {
                        notify("info", "Cadastre um merchant antes de gerar links de pagamento.");
                        return;
                      }
                      setPaymentLinkModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae] shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Link de Pagamento
                  </button>
                </div>
              </div>

              {/* Cards de Métricas Rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Total de Links</span>
                  <div className="text-2xl font-bold text-white">{paymentLinks.length}</div>
                  <p className="text-[11px] text-[#a1b0a6]">Criados na sua conta</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Links Ativos</span>
                  <div className="text-2xl font-bold text-[#00e66b]">
                    {paymentLinks.filter((l) => l.status === "ACTIVE").length}
                  </div>
                  <p className="text-[11px] text-[#a1b0a6]">Disponíveis para checkout</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8b9f93]">Conversões / Pagamentos</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">
                    {paymentLinks.reduce((acc, l) => acc + (l.timesUsed || 0), 0)}
                  </div>
                  <p className="text-[11px] text-[#a1b0a6]">Transações iniciadas</p>
                </div>
              </div>

              {/* Lista de Links de Pagamento */}
              {loadingPaymentLinks ? (
                <div className="p-12 text-center rounded-2xl bg-[#09120d] border border-[#213428]">
                  <Loader2 className="w-6 h-6 text-[#00e66b] animate-spin mx-auto mb-2" />
                  <span className="text-xs text-[#a1b0a6] font-mono">Carregando links de pagamento…</span>
                </div>
              ) : paymentLinks.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[#09120d] border border-[#213428] space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#00e66b]/10 border border-[#00e66b]/20 flex items-center justify-center text-[#00e66b] mx-auto">
                    <Link2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Nenhum Link de Pagamento Gerado</h3>
                    <p className="text-xs text-[#a1b0a6] mt-1 max-w-sm mx-auto">
                      Crie seu primeiro link de pagamento autônomo para compartilhar no WhatsApp, Instagram ou enviar para seus clientes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!merchants.length) {
                        notify("info", "Cadastre um merchant antes de gerar links de pagamento.");
                        return;
                      }
                      setPaymentLinkModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-[#69f0ae] shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Gerar Primeiro Link
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {paymentLinks.map((link) => {
                    const publicUrl = `https://pay.axionenterprise.cloud/p/${link.id}`;
                    return (
                      <div
                        key={link.id}
                        className="p-5 rounded-2xl bg-[#09120d] border border-[#213428]/80 hover:border-[#30513d] transition space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                  link.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-red-500/10 text-red-400 border-red-500/30"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${link.status === "ACTIVE" ? "bg-emerald-400" : "bg-red-400"}`} />
                                {link.status === "ACTIVE" ? "ATIVO" : link.status}
                              </span>

                              <h3 className="text-base font-bold text-white truncate">{link.title}</h3>
                            </div>

                            {link.description && (
                              <p className="text-xs text-[#a1b0a6] line-clamp-1">{link.description}</p>
                            )}
                          </div>

                          <div className="flex items-baseline gap-2 shrink-0">
                            {link.allowCustomAmount ? (
                              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                Valor Aberto / Livre
                              </span>
                            ) : (
                              <span className="text-lg font-mono font-bold text-[#00e66b]">
                                R$ {((link.amountCents || 0) / 100).toFixed(2).replace(".", ",")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Linha de Metadados e URL */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#213428]/80 text-xs">
                          <div className="flex items-center gap-4 flex-wrap text-[11px] text-[#8b9f93] font-mono">
                            <div className="flex items-center gap-1.5">
                              <span>Métodos:</span>
                              {link.acceptedMethods?.includes("PIX") && (
                                <span className="inline-flex items-center gap-1 bg-[#101d14] px-2 py-0.5 rounded text-white border border-[#213428]">
                                  <QrCode className="w-3 h-3 text-[#00e66b]" /> PIX
                                </span>
                              )}
                              {link.acceptedMethods?.includes("CARD") && (
                                <span className="inline-flex items-center gap-1 bg-[#101d14] px-2 py-0.5 rounded text-white border border-[#213428]">
                                  <CreditCard className="w-3 h-3 text-[#00e66b]" /> Cartão
                                </span>
                              )}
                            </div>

                            <div>
                              Usos: <strong className="text-white">{link.timesUsed || 0}</strong>
                              {link.maxUses ? ` / ${link.maxUses}` : ""}
                            </div>

                            {link.expiresAt && (
                              <div>
                                Expira: {new Date(link.expiresAt).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                          </div>

                          {/* Ações: Copiar Link, Abrir e Excluir */}
                          <div className="flex items-center gap-2 self-end lg:self-auto">
                            <CopyBtn text={publicUrl} />

                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir página de checkout pública"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#182b20] hover:bg-[#294333] text-xs font-mono text-[#b5c6bb] transition-all border border-[#30513d]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Abrir</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeletePaymentLink(link.id)}
                              disabled={submittingAction === `delete-link-${link.id}`}
                              title="Excluir link de pagamento"
                              className="p-1.5 rounded-lg text-[#8b9f93] hover:text-red-400 hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CONFIGURAÇÕES */}
          
          {/* TAB: RÉGUA DE NOTIFICAÇÕES VIA WHATSAPP */}
          {activeSection === "whatsapp" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                    <MessageSquare className="w-6 h-6 text-[#00e66b]" />
                    <span>Régua de Notificações via WhatsApp</span>
                  </h1>
                  <p className="text-xs text-[#a1b0a6] mt-1">
                    Notificações transacionais automatizadas integradas ao AXION Comm para envio de Pix Copia e Cola, recibos digitais e alertas.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {merchants.length > 1 && (
                    <div className="flex items-center gap-2 bg-[#09120d] border border-[#213428] rounded-xl px-3 py-1.5">
                      <Building className="w-3.5 h-3.5 text-[#00e66b]" />
                      <select
                        value={selectedWhatsappMerchantId}
                        onChange={(e) => setSelectedWhatsappMerchantId(e.target.value)}
                        className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                      >
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#09120d] text-white">
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setTestWhatsappModal(true);
                      setTestWhatsappResult(null);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#101d14] border border-[#213428] hover:border-[#00e66b] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 text-[#00e66b]" />
                    <span>Disparar Teste Real</span>
                  </button>

                  <button
                    onClick={() => selectedWhatsappMerchantId && loadWhatsappData(selectedWhatsappMerchantId)}
                    disabled={loadingWhatsapp}
                    className="p-2 rounded-xl bg-[#101d14] border border-[#213428] text-[#a1b0a6] hover:text-white transition-all cursor-pointer"
                    title="Atualizar dados"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingWhatsapp ? "animate-spin text-[#00e66b]" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Banner Mestre de Ativação */}
              <div className="rounded-2xl border border-[#213428] bg-gradient-to-r from-[#0d1710] to-[#09120d] p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center shrink-0 text-[#00e66b]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-white">Envio Transacional Automático</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-[#00e66b] border border-emerald-500/30">
                        AXION Comm Bridge Online
                      </span>
                    </div>
                    <p className="text-xs text-[#a1b0a6] mt-0.5">
                      Quando ativado, os compradores recebem o Pix Copia e Cola e o comprovante instantâneo diretamente no WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-semibold text-white">
                    {whatsappSettings?.enabled ? "ATIVADO" : "PAUSADO"}
                  </span>
                  <button
                    onClick={() => handleSaveWhatsappSettings({ enabled: !whatsappSettings?.enabled })}
                    disabled={savingWhatsapp || loadingWhatsapp}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      whatsappSettings?.enabled ? "bg-[#00e66b]" : "bg-[#213428]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                        whatsappSettings?.enabled ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Grid Principal: Configuração de Templates & Mockup WhatsApp */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Coluna Esquerda: Editor de Templates */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="rounded-2xl border border-[#213428] bg-[#09120d] p-5 space-y-4">
                    <div className="border-b border-[#213428] pb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-[#00e66b]" />
                        <span>Gatilhos e Mensagens da Régua</span>
                      </h3>
                      <span className="text-[11px] font-mono text-[#8b9f93]">Interpolação Dinâmica</span>
                    </div>

                    {/* Subtabs de Eventos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "pix_created", label: "Pix Gerado", key: "notifyOnPixCreated" },
                        { id: "payment_approved", label: "Aprovado", key: "notifyOnPaymentApproved" },
                        { id: "pix_expiring", label: "Expirando", key: "notifyOnPixExpiring" },
                        { id: "subscription_failed", label: "Falha Cartão", key: "notifyOnSubscriptionFailed" },
                      ].map((tab) => {
                        const isEnabled = whatsappSettings?.[tab.key] ?? true;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveWhatsappTab(tab.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                              activeWhatsappTab === tab.id
                                ? "bg-[#101d14] border-[#00e66b] text-white shadow-sm"
                                : "bg-[#040806]/40 border-[#213428] text-[#8b9f93] hover:text-white"
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${isEnabled ? "text-[#00e66b] bg-[#00e66b]/10" : "text-[#8b9f93] bg-zinc-800"}`}>
                              {isEnabled ? "Ativo" : "Inativo"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Conteúdo do Evento Ativo */}
                    {whatsappSettings && (
                      <div className="space-y-4 pt-2">
                        {/* Switch do Evento Ativo */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#101d14] border border-[#213428]">
                          <div>
                            <p className="text-xs font-bold text-white">
                              {activeWhatsappTab === "pix_created" && "Disparar quando uma cobrança Pix for emitida"}
                              {activeWhatsappTab === "payment_approved" && "Disparar imediatamente na aprovação do pagamento"}
                              {activeWhatsappTab === "pix_expiring" && "Lembrete 15 minutos antes de a chave Pix expirar"}
                              {activeWhatsappTab === "subscription_failed" && "Alerta quando a renovação da assinatura falhar"}
                            </p>
                            <p className="text-[11px] text-[#8b9f93]">
                              {activeWhatsappTab === "pix_created" && "Envia o código copia e cola para pagamento com 1 clique."}
                              {activeWhatsappTab === "payment_approved" && "Envia recibo digital com link do comprovante."}
                              {activeWhatsappTab === "pix_expiring" && "Reduz o abandono de carrinho em até 40%."}
                              {activeWhatsappTab === "subscription_failed" && "Evita cancelamento com link direto para atualizar o cartão."}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={
                              activeWhatsappTab === "pix_created"
                                ? whatsappSettings.notifyOnPixCreated
                                : activeWhatsappTab === "payment_approved"
                                ? whatsappSettings.notifyOnPaymentApproved
                                : activeWhatsappTab === "pix_expiring"
                                ? whatsappSettings.notifyOnPixExpiring
                                : whatsappSettings.notifyOnSubscriptionFailed
                            }
                            onChange={(e) => {
                              const key =
                                activeWhatsappTab === "pix_created"
                                  ? "notifyOnPixCreated"
                                  : activeWhatsappTab === "payment_approved"
                                  ? "notifyOnPaymentApproved"
                                  : activeWhatsappTab === "pix_expiring"
                                  ? "notifyOnPixExpiring"
                                  : "notifyOnSubscriptionFailed";
                              setWhatsappSettings({ ...whatsappSettings, [key]: e.target.checked });
                            }}
                            className="w-4 h-4 rounded text-[#00e66b] focus:ring-0 cursor-pointer"
                          />
                        </div>

                        {/* Variáveis Dinâmicas */}
                        <div>
                          <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1.5">
                            Variáveis Disponíveis (Clique para inserir)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              "{{customer_name}}",
                              "{{amount}}",
                              "{{product_title}}",
                              "{{pix_code}}",
                              "{{receipt_url}}",
                              "{{checkout_url}}",
                            ].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => insertVariableTag(tag)}
                                className="px-2 py-1 rounded-lg bg-[#040806] border border-[#213428] hover:border-[#00e66b] text-[11px] font-mono text-[#00e66b] transition-all cursor-pointer"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Textarea do Template */}
                        <div>
                          <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1.5">
                            Texto da Mensagem (Suporta formatação *negrito*, _itálico_ e ```código```)
                          </label>
                          <textarea
                            rows={6}
                            value={
                              activeWhatsappTab === "pix_created"
                                ? whatsappSettings.templatePixCreated
                                : activeWhatsappTab === "payment_approved"
                                ? whatsappSettings.templatePaymentApproved
                                : activeWhatsappTab === "pix_expiring"
                                ? whatsappSettings.templatePixExpiring
                                : whatsappSettings.templateSubscriptionFailed
                            }
                            onChange={(e) => {
                              const key =
                                activeWhatsappTab === "pix_created"
                                  ? "templatePixCreated"
                                  : activeWhatsappTab === "payment_approved"
                                  ? "templatePaymentApproved"
                                  : activeWhatsappTab === "pix_expiring"
                                  ? "templatePixExpiring"
                                  : "templateSubscriptionFailed";
                              setWhatsappSettings({ ...whatsappSettings, [key]: e.target.value });
                            }}
                            className="w-full bg-[#040806] border border-[#213428] rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#00e66b] leading-relaxed resize-none"
                          />
                        </div>

                        {/* Botão Salvar Alterações */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleSaveWhatsappSettings(whatsappSettings)}
                            disabled={savingWhatsapp}
                            className="px-4 py-2 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            {savingWhatsapp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{savingWhatsapp ? "Salvando…" : "Salvar Configurações"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita: Live WhatsApp Dark Mode Mockup */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-2xl border border-[#213428] bg-[#09120d] p-5 space-y-4">
                    <div className="border-b border-[#213428] pb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#00e66b]" />
                        <span>Prévia em Tempo Real</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[#00e66b] bg-[#00e66b]/10 px-2 py-0.5 rounded border border-[#00e66b]/20">
                        WhatsApp Dark UI
                      </span>
                    </div>

                    {/* Smartphone Screen Frame */}
                    <div className="rounded-2xl border border-[#213428] bg-[#0b141a] overflow-hidden shadow-2xl">
                      {/* WhatsApp Chat Topbar */}
                      <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center gap-2.5 border-b border-white/5">
                        <div className="w-7 h-7 rounded-full bg-[#00e66b]/20 border border-[#00e66b] flex items-center justify-center text-[#00e66b] font-bold text-[10px]">
                          AX
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {merchants.find((m) => m.id === selectedWhatsappMerchantId)?.name || "AXION Pay Merchant"}
                          </p>
                          <p className="text-[9px] text-[#00e66b] font-mono">Conta Oficial Verificada</p>
                        </div>
                      </div>

                      {/* Chat Messages Area */}
                      <div className="p-4 min-h-64 bg-[#0b141a] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px] flex flex-col justify-end">
                        {/* Outbound WhatsApp Speech Bubble */}
                        <div className="max-w-[88%] bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-none px-3.5 py-2.5 shadow-md self-end space-y-2 text-xs leading-relaxed">
                          <div className="whitespace-pre-wrap font-sans text-xs">
                            {(() => {
                              const raw =
                                activeWhatsappTab === "pix_created"
                                  ? whatsappSettings?.templatePixCreated
                                  : activeWhatsappTab === "payment_approved"
                                  ? whatsappSettings?.templatePaymentApproved
                                  : activeWhatsappTab === "pix_expiring"
                                  ? whatsappSettings?.templatePixExpiring
                                  : whatsappSettings?.templateSubscriptionFailed;

                              const sampleText = (raw || "Carregando template…")
                                .replace(/\{\{\s*customer_name\s*\}\}/g, "João da Silva")
                                .replace(/\{\{\s*amount\s*\}\}/g, "R$ 99,00")
                                .replace(/\{\{\s*product_title\s*\}\}/g, "Plano Pro Anual")
                                .replace(/\{\{\s*pix_code\s*\}\}/g, "00020126580014br.gov.bcb.pix0136123e4567...")
                                .replace(/\{\{\s*receipt_url\s*\}\}/g, "https://pay.axionenterprise.cloud/recibo/ch_123")
                                .replace(/\{\{\s*checkout_url\s*\}\}/g, "https://pay.axionenterprise.cloud/p/plink_123")
                                .replace(/\{\{\s*merchant_name\s*\}\}/g, "AXION Pay");

                              return sampleText;
                            })()}
                          </div>

                          <div className="flex items-center justify-end gap-1 text-[10px] text-white/60 pt-0.5">
                            <span>12:45</span>
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Histórico de Disparos Recentes */}
              <div className="rounded-2xl border border-[#213428] bg-[#09120d] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#213428] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#00e66b]" />
                      <span>Histórico de Notificações Disparadas</span>
                    </h3>
                    <p className="text-[11px] text-[#8b9f93] mt-0.5">
                      Auditoria detalhada de entregas transacionais enviadas pelo bridge.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#a1b0a6]">
                    {whatsappLogs.length} disparos registrados
                  </span>
                </div>

                {whatsappLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#8b9f93]">
                    Nenhuma notificação via WhatsApp registrada para esta operação.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#213428] text-[10px] font-mono text-[#8b9f93] uppercase">
                          <th className="pb-2.5">Status</th>
                          <th className="pb-2.5">Destinatário</th>
                          <th className="pb-2.5">Evento</th>
                          <th className="pb-2.5">Mensagem</th>
                          <th className="pb-2.5">Data / Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#15231a]">
                        {whatsappLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#101d14]/60 transition-colors">
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  log.status === "DELIVERED"
                                    ? "bg-emerald-500/10 text-[#00e66b] border border-emerald-500/30"
                                    : log.status === "QUEUED"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-white">
                              {log.recipientPhone.replace(/^(\d{2})(\d{2})(\d{1})(\d{4})(\d{4})$/, "+$1 ($2) $3****-$5")}
                            </td>
                            <td className="py-2.5 font-mono text-[#a1b0a6]">{log.eventType}</td>
                            <td className="py-2.5 text-[#e1ece4] max-w-xs truncate" title={log.messageBody}>
                              {log.messageBody}
                            </td>
                            <td className="py-2.5 font-mono text-[#8b9f93]">
                              {new Date(log.createdAt).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* MODAL: DISPARAR MENSAGEM DE TESTE */}
              {testWhatsappModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-4 shadow-2xl relative animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#213428] pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Play className="w-4 h-4 text-[#00e66b]" />
                        <span>Simular Envio no WhatsApp</span>
                      </h3>
                      <button
                        onClick={() => setTestWhatsappModal(false)}
                        className="p-1 text-[#8b9f93] hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                          Telefone Destinatário (com DDD)
                        </label>
                        <input
                          type="tel"
                          placeholder="Ex: 11999999999"
                          value={testWhatsappPhone}
                          onChange={(e) => setTestWhatsappPhone(e.target.value)}
                          className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e66b]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                          Tipo de Evento Transacional
                        </label>
                        <select
                          value={testWhatsappEvent}
                          onChange={(e) => setTestWhatsappEvent(e.target.value)}
                          className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e66b] cursor-pointer"
                        >
                          <option value="pix_created">Pix Gerado (Código Copia e Cola)</option>
                          <option value="payment_approved">Pagamento Confirmado (Recibo Digital)</option>
                          <option value="pix_expiring">Cobrança Expirando (Lembrete)</option>
                          <option value="subscription_failed">Falha na Renovação de Assinatura</option>
                        </select>
                      </div>

                      {testWhatsappResult && (
                        <div
                          className={`p-3 rounded-xl border text-xs font-mono ${
                            testWhatsappResult.success
                              ? "bg-[#00e66b]/10 border-[#00e66b]/30 text-[#00e66b]"
                              : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}
                        >
                          <p className="font-bold">
                            {testWhatsappResult.success ? "Enviado com sucesso via bridge!" : "Falha no envio:"}
                          </p>
                          <p className="text-[11px] mt-1 break-all">
                            {testWhatsappResult.error || "Mensagem enfileirada e entregue."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#213428]">
                      <button
                        onClick={() => setTestWhatsappModal(false)}
                        className="px-4 py-2 rounded-xl bg-[#101d14] hover:bg-zinc-800 text-xs font-semibold text-[#a1b0a6] cursor-pointer"
                      >
                        Fechar
                      </button>
                      <button
                        onClick={handleSendTestWhatsapp}
                        disabled={testingWhatsapp}
                        className="px-4 py-2 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                      >
                        {testingWhatsapp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{testingWhatsapp ? "Enviando…" : "Disparar Teste"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "api-logs" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#00e66b]" />
                    <h1 className="text-xl font-bold text-white tracking-tight">Logs de API (Request Inspector)</h1>
                  </div>
                  <p className="text-xs text-[#a1b0a6] mt-0.5">
                    Auditoria e telemetria em tempo real de cada chamada HTTP recebida pela API do AXION Pay
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {merchants.length > 1 && (
                    <select
                      value={selectedApiLogMerchantId}
                      onChange={(e) => setSelectedApiLogMerchantId(e.target.value)}
                      className="bg-[#09120d] border border-[#213428] text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-[#00e66b]"
                    >
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                      autoRefreshLogs
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                        : "bg-[#09120d] text-[#8b9f93] border-[#213428] hover:text-white"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoRefreshLogs ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                    Auto-refresh: {autoRefreshLogs ? "ON (5s)" : "OFF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => loadApiLogs(selectedApiLogMerchantId)}
                    disabled={loadingApiLogs}
                    className="p-2 bg-[#09120d] hover:bg-[#101d14] border border-[#213428] text-[#a1b0a6] hover:text-white rounded-xl transition cursor-pointer"
                    title="Atualizar agora"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingApiLogs ? "animate-spin text-[#00e66b]" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleClearApiLogs}
                    disabled={purgingLogs || apiLogs.length === 0}
                    className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    title="Purgar histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Logs</span>
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase tracking-wider block">Requisições (24h)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {apiLogMetrics?.totalRequests24h ?? 0}
                    </span>
                    <span className="text-[10px] text-[#8b9f93]">chamadas</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase tracking-wider block">Taxa de Sucesso</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${
                      (apiLogMetrics?.successRate ?? 100) >= 95 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {apiLogMetrics?.successRate ?? 100}%
                    </span>
                    <span className="text-[10px] text-[#8b9f93]">2xx responses</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase tracking-wider block">Latência Média</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-white">
                      {apiLogMetrics?.avgLatencyMs ?? 0}
                      <span className="text-xs font-normal text-[#8b9f93]">ms</span>
                    </span>
                    <span className="text-[10px] text-emerald-400">p50</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase tracking-wider block">Erros (4xx / 5xx)</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${
                      ((apiLogMetrics?.clientErrors24h ?? 0) + (apiLogMetrics?.serverErrors24h ?? 0)) > 0
                        ? "text-rose-400"
                        : "text-[#8b9f93]"
                    }`}>
                      {apiLogMetrics?.clientErrors24h ?? 0}
                      <span className="text-xs text-[#8b9f93]"> / </span>
                      {apiLogMetrics?.serverErrors24h ?? 0}
                    </span>
                    <span className="text-[10px] text-[#8b9f93]">falhas</span>
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="p-3 rounded-2xl bg-[#09120d] border border-[#213428] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#050c08] border border-[#213428] rounded-xl px-3 py-1.5 text-xs">
                    <Search className="w-3.5 h-3.5 text-[#8b9f93]" />
                    <input
                      type="text"
                      placeholder="Filtrar por rota (/v1/charges) ou idempotency-key..."
                      value={apiLogSearch}
                      onChange={(e) => setApiLogSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") loadApiLogs(selectedApiLogMerchantId);
                      }}
                      className="bg-transparent text-white placeholder-[#8b9f93] outline-none text-xs w-64 md:w-80 font-mono"
                    />
                  </div>

                  {/* Method Filters */}
                  <div className="flex items-center bg-[#050c08] p-1 rounded-xl border border-[#213428] gap-1">
                    {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setApiLogMethodFilter(m)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                          apiLogMethodFilter === m
                            ? "bg-[#00e66b] text-black"
                            : "text-[#8b9f93] hover:text-white"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Status Filters */}
                  <div className="flex items-center bg-[#050c08] p-1 rounded-xl border border-[#213428] gap-1">
                    {[
                      { id: "ALL", label: "TODOS" },
                      { id: "2xx", label: "2xx OK" },
                      { id: "4xx", label: "4xx Erro" },
                      { id: "5xx", label: "5xx Falha" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setApiLogStatusFilter(s.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                          apiLogStatusFilter === s.id
                            ? "bg-[#182b20] text-emerald-400 border border-[#30513d]"
                            : "text-[#8b9f93] hover:text-white"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-[#8b9f93]">
                  {apiLogs.length} requisições encontradas
                </span>
              </div>

              {/* Logs Table */}
              <div className="rounded-2xl bg-[#09120d] border border-[#213428] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#213428] bg-[#050c08]/60 text-[#8b9f93] font-mono uppercase text-[10px] tracking-wider">
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Método</th>
                        <th className="p-3.5">Rota / Endpoint</th>
                        <th className="p-3.5">Latência</th>
                        <th className="p-3.5">IP de Origem</th>
                        <th className="p-3.5">Idempotency Key</th>
                        <th className="p-3.5">Data & Hora</th>
                        <th className="p-3.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#213428]/60">
                      {loadingApiLogs && apiLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-[#8b9f93]">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00e66b] mx-auto mb-2" />
                            Carregando requisições...
                          </td>
                        </tr>
                      ) : apiLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-[#8b9f93]">
                            <Terminal className="w-8 h-8 text-[#213428] mx-auto mb-2" />
                            Nenhuma requisição registrada para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        apiLogs.map((log) => {
                          const is2xx = log.statusCode >= 200 && log.statusCode < 300;
                          const is4xx = log.statusCode >= 400 && log.statusCode < 500;
                          const is5xx = log.statusCode >= 500;
                          return (
                            <tr
                              key={log.id}
                              onClick={() => {
                                setInspectedLog(log);
                                setInspectedLogTab("general");
                              }}
                              className="hover:bg-[#101d14] transition cursor-pointer group"
                            >
                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                  is2xx
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : is4xx
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    is2xx ? "bg-emerald-400" : is4xx ? "bg-amber-400" : "bg-rose-400"
                                  }`} />
                                  {log.statusCode}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  log.method === "POST"
                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                    : log.method === "GET"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : log.method === "DELETE"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}>
                                  {log.method}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <span className="font-mono text-white group-hover:text-[#00e66b] transition font-medium">
                                  {log.path}
                                </span>
                              </td>

                              <td className="p-3.5 font-mono text-[11px] tabular-nums">
                                <span className={
                                  log.latencyMs < 200
                                    ? "text-emerald-400"
                                    : log.latencyMs < 600
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }>
                                  {log.latencyMs}ms
                                </span>
                              </td>

                              <td className="p-3.5 font-mono text-[11px] text-[#8b9f93]">
                                {log.ipAddress || "127.0.0.1"}
                              </td>

                              <td className="p-3.5 font-mono text-[10px] text-[#8b9f93] max-w-[120px] truncate">
                                {log.idempotencyKey || "—"}
                              </td>

                              <td className="p-3.5 font-mono text-[11px] text-[#8b9f93] whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </td>

                              <td className="p-3.5 text-right">
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#00e66b] font-medium opacity-80 group-hover:opacity-100">
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>Inspecionar</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === "subscriptions" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header com Dropdown de Merchant e Botão de Criação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#213428] pb-5">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00e66b]" />
                    <span>Assinaturas Recorrentes & Portal do Assinante</span>
                  </h1>
                  <p className="text-xs text-[#a1b0a6] mt-0.5">
                    Controle de assinantes, métricas de MRR, retenção e links de autoatendimento self-service.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedSubMerchantId}
                    onChange={(e) => setSelectedSubMerchantId(e.target.value)}
                    className="bg-[#101d14] border border-[#213428] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00e66b] cursor-pointer"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setNewSubModal(true)}
                    className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Assinatura</span>
                  </button>
                </div>
              </div>

              {/* Cards de Métricas de Recorrência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase">MRR Ativo (Mensal)</span>
                  <div className="text-2xl font-bold text-white font-mono">
                    R$ {(((subMetrics?.activeMrrCents ?? 0) / 100)).toFixed(2).replace(".", ",")}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Receita Recorrente Mensal</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase">Assinantes Ativos</span>
                  <div className="text-2xl font-bold text-[#00e66b] font-mono">
                    {subMetrics?.activeCount ?? 0}
                  </div>
                  <span className="text-[10px] text-[#8b9f93] font-mono">Clientes em adimplência</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase">Taxa de Churn</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono">
                    {subMetrics?.churnRatePercent ?? 0}%
                  </div>
                  <span className="text-[10px] text-[#8b9f93] font-mono">Cancelamentos no período</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#09120d] border border-[#213428] space-y-1">
                  <span className="text-[11px] font-mono text-[#8b9f93] uppercase">Total de Contratos</span>
                  <div className="text-2xl font-bold text-white font-mono">
                    {subMetrics?.totalCount ?? 0}
                  </div>
                  <span className="text-[10px] text-[#8b9f93] font-mono">Base histórica da operação</span>
                </div>
              </div>

              {/* Tabela de Assinaturas */}
              <div className="rounded-2xl bg-[#09120d] border border-[#213428] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#213428] bg-[#050c08]/50">
                  <span className="text-xs font-bold text-white">Carteira de Clientes Recorrentes</span>
                  <button
                    type="button"
                    onClick={() => selectedSubMerchantId && loadSubscriptions(selectedSubMerchantId)}
                    className="text-xs text-[#00e66b] hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingSubs ? "animate-spin" : ""}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#213428] bg-[#050c08]/60 text-[#8b9f93] font-mono uppercase text-[10px]">
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Cliente / Assinante</th>
                        <th className="p-3.5">Plano / Valor</th>
                        <th className="p-3.5">Método</th>
                        <th className="p-3.5">Próxima Renovação</th>
                        <th className="p-3.5 text-right">Portal Self-Service</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#213428]/60">
                      {loadingSubs && subscriptionsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#8b9f93]">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00e66b] mx-auto mb-2" />
                            Carregando assinaturas da operação...
                          </td>
                        </tr>
                      ) : subscriptionsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#8b9f93]">
                            <Users className="w-8 h-8 text-[#213428] mx-auto mb-2" />
                            Nenhuma assinatura cadastrada para esta operação.
                          </td>
                        </tr>
                      ) : (
                        subscriptionsList.map((sub) => {
                          const portalUrl = `https://pay.axionenterprise.cloud/portal/${sub.portalToken}`;
                          return (
                            <tr key={sub.id} className="hover:bg-[#101d14]/40 transition-colors">
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                    sub.status === "ACTIVE"
                                      ? "bg-emerald-500/10 text-[#00e66b] border border-emerald-500/30"
                                      : sub.status === "CANCELED"
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  }`}
                                >
                                  {sub.status === "ACTIVE" ? "Ativa" : sub.status === "CANCELED" ? "Cancelada" : sub.status}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-white">{sub.customerName}</div>
                                <div className="text-[11px] text-[#8b9f93] font-mono">{sub.customerEmail}</div>
                              </td>
                              <td className="p-3.5">
                                <div className="text-white font-medium">{sub.planName || "Plano Standard"}</div>
                                <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                                  R$ {((sub.amountCents || 0) / 100).toFixed(2).replace(".", ",")}
                                  <span className="text-[10px] text-[#8b9f93] font-sans font-normal ml-1">/ {sub.interval === "YEAR" ? "ano" : "mês"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="text-white font-mono uppercase text-[11px]">
                                  {sub.paymentMethodBrand || "Cartão"}
                                </div>
                                <div className="text-[10px] text-[#8b9f93] font-mono">
                                  •••• {sub.paymentMethodLast4 || "4242"}
                                </div>
                              </td>
                              <td className="p-3.5 font-mono text-[11px] text-[#8b9f93]">
                                {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR") : "—"}
                              </td>
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(portalUrl);
                                      notify("success", "Link do Portal do Assinante copiado!");
                                    }}
                                    className="p-1.5 rounded-lg bg-[#101d14] hover:bg-[#182b20] border border-[#213428] text-[#00e66b] transition cursor-pointer"
                                    title="Copiar Link Seguro do Portal"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={portalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-[#101d14] hover:bg-[#182b20] border border-[#213428] text-white transition inline-flex items-center"
                                    title="Abrir Portal do Cliente"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal: Nova Assinatura */}
              {newSubModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-4 shadow-2xl animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#213428] pb-3">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#00e66b]" />
                        <span>Cadastrar Assinatura com Portal</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setNewSubModal(false)}
                        className="text-[#8b9f93] hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateSubscription} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                          Nome do Assinante
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Carlos Santana"
                          value={newSubForm.customerName}
                          onChange={(e) => setNewSubForm({ ...newSubForm, customerName: e.target.value })}
                          className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00e66b]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                          E-mail do Cliente
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="cliente@exemplo.com"
                          value={newSubForm.customerEmail}
                          onChange={(e) => setNewSubForm({ ...newSubForm, customerEmail: e.target.value })}
                          className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00e66b]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                            Bandeira Cartão
                          </label>
                          <select
                            value={newSubForm.paymentMethodBrand}
                            onChange={(e) => setNewSubForm({ ...newSubForm, paymentMethodBrand: e.target.value })}
                            className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00e66b] cursor-pointer"
                          >
                            <option value="mastercard">Mastercard</option>
                            <option value="visa">Visa</option>
                            <option value="elo">Elo</option>
                            <option value="amex">Amex</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                            Últimos 4 Dígitos
                          </label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="4242"
                            value={newSubForm.paymentMethodLast4}
                            onChange={(e) => setNewSubForm({ ...newSubForm, paymentMethodLast4: e.target.value.replace(/\D/g, '') })}
                            className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00e66b]"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setNewSubModal(false)}
                          className="px-4 py-2 bg-[#101d14] hover:bg-[#182b20] text-zinc-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submittingAction === "create-sub"}
                          className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          {submittingAction === "create-sub" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Confirmar & Gerar Link</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal de Sucesso com Link do Portal */}
              {createdPortalUrlModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-4 shadow-2xl animate-fadeIn">
                    <div className="flex items-center gap-3 text-[#00e66b]">
                      <CheckCircle2 className="w-6 h-6" />
                      <div>
                        <h3 className="text-base font-bold text-white">Assinatura Ativada!</h3>
                        <p className="text-xs text-[#a1b0a6]">Link seguro de autoatendimento para {createdPortalUrlModal.customerName}</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-2">
                      <span className="text-[10px] uppercase font-mono text-[#8b9f93]">URL Direta do Portal do Assinante:</span>
                      <div className="font-mono text-xs text-[#00e66b] break-all select-all">
                        {createdPortalUrlModal.url}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdPortalUrlModal.url);
                          notify("success", "Link copiado!");
                        }}
                        className="px-4 py-2 bg-[#101d14] hover:bg-[#182b20] border border-[#30513d] text-[#00e66b] font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreatedPortalUrlModal(null)}
                        className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs rounded-xl transition cursor-pointer"
                      >
                        Concluído
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "settings" && (
            <div className="space-y-6 animate-fadeIn max-w-2xl">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Configurações da Conta</h1>
                <p className="text-xs text-[#a1b0a6] mt-0.5">Definições da organização</p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Nome da Organização</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: AXION Enterprise LTDA"
                    value={settings.organizationName || ""}
                    onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingAction === "settings"}
                  className="px-5 py-2.5 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {submittingAction === "settings" ? "Salvando…" : "Salvar Configurações"}
                </button>
              </form>

              {/* CARD DE DADOS BANCÁRIOS & PIX */}
              <div className="p-6 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-[#00e66b]" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Chave Pix de Recebimento de Saques</h3>
                      <p className="text-xs text-[#a1b0a6]">Chave bancária onde os saques solicitados são creditados</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (balances?.pixKey) setPixKeyValue(balances.pixKey);
                      if (balances?.pixKeyType) setSelectedPixType(balances.pixKeyType as any);
                      setPixKeyModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-[#30513d] bg-[#101d14] hover:bg-[#182b20] text-xs font-bold text-[#69f0ae] transition cursor-pointer"
                  >
                    {balances?.pixKey ? "Editar Chave" : "Cadastrar Chave"}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-[#050c08] border border-[#213428] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#8b9f93] font-mono text-[10px] uppercase block">Chave Ativa</span>
                    <span className="font-mono text-white text-sm font-semibold">
                      {balances?.pixKey ? balances.pixKey : "Nenhuma chave cadastrada"}
                    </span>
                  </div>
                  {balances?.pixKeyType && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20 uppercase">
                      {balances.pixKeyType}
                    </span>
                  )}
                </div>
              </div>

              {/* CARD DE TAXAS E PRAZOS COMERCIAIS */}
              <div className="p-6 rounded-2xl bg-[#09120d] border border-[#213428]/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Percent className="w-5 h-5 text-[#00e66b]" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Taxas & Prazos de Liquidação</h3>
                      <p className="text-xs text-[#a1b0a6]">Condições comerciais ativas aplicadas às suas vendas</p>
                    </div>
                  </div>
                  {canReviewKyc && merchants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const m = merchants[0];
                        setEditingRatesMerchant(m);
                        setEditFeePixPercent(String(m.feePixPercent ?? 1.99));
                        setEditFeePixFixed(String(((m.feePixFixedCents ?? 50) / 100).toFixed(2)));
                        setEditFeeCardPercent(String(m.feeCardPercent ?? 3.49));
                        setEditFeePayout(String(((m.feePayoutFixedCents ?? 200) / 100).toFixed(2)));
                        setEditSettlementPix(String(m.settlementDaysPix ?? 0));
                        setEditSettlementCard(String(m.settlementDaysCard ?? 14));
                        setRatesModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-[#30513d] bg-[#101d14] hover:bg-[#182b20] text-xs font-bold text-[#69f0ae] transition cursor-pointer"
                    >
                      Editar Taxas (Admin)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] font-mono text-[#8b9f93] uppercase block">MDR Pix</span>
                    <span className="text-base font-bold text-white">
                      {balances?.rates?.feePixPercent ?? 1.99}% + R$ {(((balances?.rates?.feePixFixedCents ?? 50) / 100).toFixed(2)).replace(".", ",")}
                    </span>
                    <span className="text-[10px] text-[#a1b0a6] block">Por transação paga</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] font-mono text-[#8b9f93] uppercase block">Prazo Pix</span>
                    <span className="text-base font-bold text-emerald-400">
                      D+{balances?.rates?.settlementDaysPix ?? 0}
                    </span>
                    <span className="text-[10px] text-[#a1b0a6] block">
                      {(balances?.rates?.settlementDaysPix ?? 0) === 0 ? "Liquidação imediata" : "Dias úteis"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] font-mono text-[#8b9f93] uppercase block">Taxa Cartão</span>
                    <span className="text-base font-bold text-white">
                      {balances?.rates?.feeCardPercent ?? 3.49}%
                    </span>
                    <span className="text-[10px] text-[#a1b0a6] block">À vista nacional</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] font-mono text-[#8b9f93] uppercase block">Prazo Cartão</span>
                    <span className="text-base font-bold text-amber-400">
                      D+{balances?.rates?.settlementDaysCard ?? 14}
                    </span>
                    <span className="text-[10px] text-[#a1b0a6] block">Dias de carência</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] font-mono text-[#8b9f93] uppercase block">Taxa de Saque</span>
                    <span className="text-base font-bold text-white">
                      R$ {(((balances?.rates?.feePayoutFixedCents ?? 200) / 100).toFixed(2)).replace(".", ",")}
                    </span>
                    <span className="text-[10px] text-[#a1b0a6] block">Por solicitação Pix</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] font-mono text-[#8b9f93] uppercase block">Saque Mínimo</span>
                    <span className="text-base font-bold text-white">
                      R$ 10,00
                    </span>
                    <span className="text-[10px] text-[#a1b0a6] block">Valor mínimo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      
      {/* MODAL CRIAR LINK DE PAGAMENTO */}
      {paymentLinkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Criar Link de Pagamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentLinkModal(false)}
                className="text-[#a1b0a6] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentLink} className="space-y-4 text-xs">
              {merchants.length > 1 && (
                <div>
                  <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                    Operação (Merchant)
                  </label>
                  <select
                    value={selectedPaymentLinkMerchantId}
                    onChange={(e) => setSelectedPaymentLinkMerchantId(e.target.value)}
                    className="w-full bg-[#050c08] border border-[#213428] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#00e66b]"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.tradingName || m.legalName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                  Título do Produto ou Cobrança *
                </label>
                <input
                  type="text"
                  required
                  value={newPaymentLinkTitle}
                  onChange={(e) => setNewPaymentLinkTitle(e.target.value)}
                  placeholder="Ex: Consultoria de Tráfego Pago, E-book, Ingresso"
                  className="w-full bg-[#050c08] border border-[#213428] rounded-xl px-3.5 py-2.5 text-white placeholder-[#506657] focus:outline-none focus:border-[#00e66b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                  Descrição Exibida no Checkout
                </label>
                <textarea
                  value={newPaymentLinkDesc}
                  onChange={(e) => setNewPaymentLinkDesc(e.target.value)}
                  rows={2}
                  placeholder="Descreva detalhes, garantia ou instruções para o comprador…"
                  className="w-full bg-[#050c08] border border-[#213428] rounded-xl px-3.5 py-2 text-white placeholder-[#506657] focus:outline-none focus:border-[#00e66b]"
                />
              </div>

              {/* Configuração de Valor */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#050c08] border border-[#213428]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Tipo de Valor</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPaymentLinkCustom}
                      onChange={(e) => setNewPaymentLinkCustom(e.target.checked)}
                      className="rounded accent-[#00e66b]"
                    />
                    <span className="text-[11px] text-[#a1b0a6]">Permitir valor aberto (doação / cliente escolhe)</span>
                  </label>
                </div>

                {!newPaymentLinkCustom && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                      Valor Fixo em R$ *
                    </label>
                    <div className="flex items-center gap-2 bg-[#09120d] border border-[#213428] rounded-xl px-3.5 py-2">
                      <span className="font-mono text-[#00e66b] font-bold">R$</span>
                      <input
                        type="text"
                        required={!newPaymentLinkCustom}
                        value={newPaymentLinkAmount}
                        onChange={(e) => setNewPaymentLinkAmount(e.target.value)}
                        placeholder="49,90"
                        className="bg-transparent text-white font-mono font-bold focus:outline-none w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Formas de Pagamento Aceitas */}
              <div>
                <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-2">
                  Formas de Pagamento Aceitas *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      newPaymentLinkMethods.includes("PIX")
                        ? "border-[#00e66b]/60 bg-[#00e66b]/10 text-white"
                        : "border-[#213428] bg-[#050c08] text-[#a1b0a6]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newPaymentLinkMethods.includes("PIX")}
                      onChange={(e) => {
                        if (e.target.checked) setNewPaymentLinkMethods((prev) => [...prev, "PIX"]);
                        else setNewPaymentLinkMethods((prev) => prev.filter((m) => m !== "PIX"));
                      }}
                      className="rounded accent-[#00e66b]"
                    />
                    <QrCode className="w-4 h-4 text-[#00e66b]" />
                    <span className="font-semibold text-xs">PIX Instantâneo</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      newPaymentLinkMethods.includes("CARD")
                        ? "border-[#00e66b]/60 bg-[#00e66b]/10 text-white"
                        : "border-[#213428] bg-[#050c08] text-[#a1b0a6]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newPaymentLinkMethods.includes("CARD")}
                      onChange={(e) => {
                        if (e.target.checked) setNewPaymentLinkMethods((prev) => [...prev, "CARD"]);
                        else setNewPaymentLinkMethods((prev) => prev.filter((m) => m !== "CARD"));
                      }}
                      className="rounded accent-[#00e66b]"
                    />
                    <CreditCard className="w-4 h-4 text-[#00e66b]" />
                    <span className="font-semibold text-xs">Cartão de Crédito</span>
                  </label>
                </div>
              </div>

              {/* Parâmetros Opcionais: Expiração e Limite de Usos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                    Expiração (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newPaymentLinkExpiresAt}
                    onChange={(e) => setNewPaymentLinkExpiresAt(e.target.value)}
                    className="w-full bg-[#050c08] border border-[#213428] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#00e66b]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">
                    Limite de Vendas (Opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPaymentLinkMaxUses}
                    onChange={(e) => setNewPaymentLinkMaxUses(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full bg-[#050c08] border border-[#213428] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#00e66b]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentLinkModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#213428] text-xs font-semibold text-[#a1b0a6] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction === "create-payment-link"}
                  className="px-5 py-2.5 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction === "create-payment-link" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Gerando…
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Gerar Link
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LINK GERADO COM SUCESSO */}
      {createdLinkUrlModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#09120d] border border-[#00e66b]/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#00e66b]/20 border border-[#00e66b] flex items-center justify-center text-[#00e66b] mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Link de Pagamento Criado!</h3>
              <p className="text-xs text-[#a1b0a6] mt-1">{createdLinkUrlModal.title}</p>
            </div>

            <div className="p-3 bg-[#050c08] border border-[#213428] rounded-xl text-left">
              <span className="block text-[10px] font-mono text-[#8b9f93] uppercase mb-1">Link Compartilhável</span>
              <input
                type="text"
                readOnly
                value={createdLinkUrlModal.url}
                className="w-full bg-transparent text-xs font-mono text-[#00e66b] select-all focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1">
                <CopyBtn text={createdLinkUrlModal.url} />
              </div>
              <a
                href={createdLinkUrlModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black text-xs font-bold inline-flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Testar</span>
              </a>
              <button
                type="button"
                onClick={() => setCreatedLinkUrlModal(null)}
                className="px-4 py-2 rounded-xl bg-[#101d14] hover:bg-[#182b20] border border-[#213428] text-xs font-semibold text-white transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-[#30513d] bg-[#18181f]/95 p-4 shadow-2xl backdrop-blur" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            {toast.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" /> : toast.type === "error" ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" /> : <Activity className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />}
            <p className="flex-1 text-sm leading-5 text-[#f3f7f4]">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} aria-label="Fechar notificação" className="text-[#8b9f93] transition hover:text-white"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      )}

      {pendingRevoke && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingAction) setPendingRevoke(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="revoke-title" aria-describedby="revoke-description" className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#09120d] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"><Trash2 className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <h2 id="revoke-title" className="text-base font-bold text-white">Revogar chave de API?</h2>
                <p id="revoke-description" className="mt-2 text-sm leading-6 text-[#a1b0a6]">A chave “{pendingRevoke.name}” deixará de funcionar imediatamente. Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingRevoke(null)} disabled={Boolean(submittingAction)} className="rounded-xl border border-[#30513d] px-4 py-2.5 text-xs font-bold text-[#d4e7da] transition hover:bg-[#182b20] disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => handleRevokeApiKey(pendingRevoke.id)} disabled={submittingAction === `revoke-${pendingRevoke.id}`} className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60">{submittingAction === `revoke-${pendingRevoke.id}` ? "Revogando…" : "Revogar chave"}</button>
            </div>
          </section>
        </div>
      )}

      {kycReviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingAction) setKycReviewModal(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="kyc-review-title" className="w-full max-w-lg rounded-3xl border border-[#30513d] bg-[#09120d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="kyc-review-title" className="text-base font-bold text-white">Analisar solicitação KYC</h2><p className="mt-1 text-xs text-[#a1b0a6]">{kycReviewModal.legalName} · documento final {kycReviewModal.documentLastFour}</p></div>
              <button type="button" onClick={() => setKycReviewModal(null)} disabled={Boolean(submittingAction)} aria-label="Fechar análise KYC" className="text-[#8b9f93] transition hover:text-white"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-[#213428] bg-[#050c08] p-3"><p className="text-[#8b9f93]">E-mail</p><p className="mt-1 break-all text-[#d4e7da]">{kycReviewModal.billingEmail}</p></div><div className="rounded-xl border border-[#213428] bg-[#050c08] p-3"><p className="text-[#8b9f93]">Telefone</p><p className="mt-1 text-[#d4e7da]">{kycReviewModal.phoneE164}</p></div></div>
              <div><label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Decisão</label><select value={kycReviewStatus} onChange={(e) => setKycReviewStatus(e.target.value as typeof kycReviewStatus)} className="w-full rounded-xl border border-[#30513d] bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none"><option value="IN_REVIEW">Manter em revisão</option><option value="ACTION_REQUIRED">Solicitar ajustes</option><option value="APPROVED">Aprovar organização</option><option value="REJECTED">Rejeitar solicitação</option></select></div>
              <div><label className="mb-1.5 block text-xs font-medium text-[#b5c6bb]">Motivo {(["ACTION_REQUIRED", "REJECTED"].includes(kycReviewStatus) ? "(obrigatório)" : "(opcional)")}</label><textarea value={kycReviewReason} onChange={(e) => setKycReviewReason(e.target.value)} maxLength={1000} className="min-h-24 w-full rounded-xl border border-[#30513d] bg-[#050c08] px-3.5 py-2.5 text-sm text-white focus:border-[#00e66b] focus:outline-none" /></div>
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100/80">A decisão é registrada com seu usuário AXION e pode liberar ou bloquear imediatamente novas chaves de API do solicitante.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setKycReviewModal(null)} disabled={Boolean(submittingAction)} className="rounded-xl border border-[#30513d] px-4 py-2.5 text-xs font-bold text-[#d4e7da] transition hover:bg-[#182b20] disabled:opacity-50">Cancelar</button><button type="button" onClick={handleReviewKyc} disabled={submittingAction === "kyc-review"} className="rounded-xl bg-[#00e66b] px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-[#69f0ae] disabled:cursor-wait disabled:opacity-60">{submittingAction === "kyc-review" ? "Registrando…" : "Registrar decisão"}</button></div>
          </section>
        </div>
      )}

      {/* MODAL NOVO MERCHANT */}
      {merchantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Cadastrar Novo Merchant</h3>
              <button onClick={() => setMerchantModal(false)} className="text-[#a1b0a6] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMerchant} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Nome da Operação / Loja</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: AXION Cloud Services"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm text-white focus:border-[#00e66b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">CNPJ / CPF (Opcional)</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={newMerchantDoc}
                  onChange={(e) => setNewMerchantDoc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm text-white focus:border-[#00e66b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">E-mail Financeiro (Opcional)</label>
                <input
                  type="email"
                  placeholder="financeiro@empresa.com"
                  value={newMerchantEmail}
                  onChange={(e) => setNewMerchantEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm text-white focus:border-[#00e66b] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction === "merchant"}
                className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {submittingAction === "merchant" ? "Cadastrando…" : "Confirmar Cadastro"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA CHAVE DE API */}
      {apiKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Gerar Chave de API</h3>
              <button
                onClick={() => {
                  setApiKeyModal(false);
                  setGeneratedKey(null);
                }}
                className="text-[#a1b0a6] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Chave criada com sucesso!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Copie a chave agora. Por razões de segurança, ela não será exibida novamente.
                  </p>
                </div>

                <div className="p-3 bg-[#050c08] border border-[#213428] rounded-xl flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-[#00e66b] select-all break-all">{generatedKey}</code>
                  <CopyBtn text={generatedKey} />
                </div>

                <button
                  onClick={() => {
                    setApiKeyModal(false);
                    setGeneratedKey(null);
                  }}
                  className="w-full py-2.5 bg-[#182b20] hover:bg-[#294333] text-white font-bold text-xs rounded-xl"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Merchant Vinculado</label>
                  <select
                    value={keyMerchantId}
                    onChange={(e) => setKeyMerchantId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-xs font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Identificador da Chave</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Produção Backend Flow"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAction === "api-key"}
                  className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {submittingAction === "api-key" ? "Gerando…" : "Gerar Chave Segura"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR SAQUE PIX */}
      {payoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-[#00e66b]" />
                </div>
                <h3 className="text-base font-bold text-white">Solicitar Saque Pix</h3>
              </div>
              <button onClick={() => setPayoutModal(false)} className="text-[#a1b0a6] hover:text-white cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#050c08] border border-[#213428] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9f93]">Saldo Disponível</span>
                  <span className="font-bold text-white font-mono">
                    R$ {((balances?.availableBalanceCents ?? 0) / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9f93]">Chave Pix de Destino</span>
                  <span className="font-mono text-emerald-400 font-semibold truncate max-w-[200px]">
                    {balances?.pixKey || "Nenhuma chave cadastrada"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">
                  Valor do Saque (R$) <span className="text-[#8b9f93]">(mínimo R$ 10,00)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-[#8b9f93] font-mono">R$</span>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
              </div>

              {/* Resumo da Transferência */}
              {parseFloat(payoutAmount.replace(",", ".")) >= 10 && (
                <div className="p-3.5 rounded-xl bg-[#101d14] border border-[#30513d] text-xs space-y-1.5">
                  <div className="flex justify-between text-[#b5c6bb]">
                    <span>Valor solicitado:</span>
                    <span className="font-mono">R$ {parseFloat(payoutAmount.replace(",", ".")).toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between text-[#a1b0a6]">
                    <span>Taxa de saque:</span>
                    <span className="font-mono">- R$ {(((balances?.rates?.feePayoutFixedCents ?? 200) / 100).toFixed(2)).replace(".", ",")}</span>
                  </div>
                  <div className="border-t border-[#213428] pt-1.5 flex justify-between font-bold text-white">
                    <span>Você receberá:</span>
                    <span className="text-emerald-400 font-mono">
                      R$ {Math.max(0, parseFloat(payoutAmount.replace(",", ".")) - ((balances?.rates?.feePayoutFixedCents ?? 200) / 100)).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingAction === "payout" || !payoutAmount}
                className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {submittingAction === "payout" ? "Processando Saque…" : "Confirmar Saque Pix"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAR CHAVE PIX */}
      {pixKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center">
                  <Key className="w-4 h-4 text-[#00e66b]" />
                </div>
                <h3 className="text-base font-bold text-white">Cadastrar Chave Pix</h3>
              </div>
              <button onClick={() => setPixKeyModal(false)} className="text-[#a1b0a6] hover:text-white cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePixKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Tipo de Chave Pix</label>
                <select
                  value={selectedPixType}
                  onChange={(e) => setSelectedPixType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-xs font-mono text-white focus:border-[#00e66b] focus:outline-none"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Telefone Celular</option>
                  <option value="RANDOM">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Chave Pix de Destino</label>
                <input
                  type="text"
                  required
                  placeholder={
                    selectedPixType === "CPF"
                      ? "000.000.000-00"
                      : selectedPixType === "CNPJ"
                      ? "00.000.000/0001-00"
                      : selectedPixType === "EMAIL"
                      ? "seu@email.com"
                      : selectedPixType === "PHONE"
                      ? "+5511999999999"
                      : "Chave aleatória UUID"
                  }
                  value={pixKeyValue}
                  onChange={(e) => setPixKeyValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-[#a1b0a6] leading-relaxed">
                Esta chave será usada exclusivamente para receber os saques e transferências de saldo da sua conta AXION Pay.
              </p>

              <button
                type="submit"
                disabled={submittingAction === "pix-key"}
                className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {submittingAction === "pix-key" ? "Salvando…" : "Salvar Chave Pix"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TAXAS & PRAZOS (ADMIN) */}
      {ratesModal && editingRatesMerchant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Taxas & Prazos da Operação</h3>
                  <p className="text-xs text-[#a1b0a6]">{editingRatesMerchant.name}</p>
                </div>
              </div>
              <button onClick={() => setRatesModal(false)} className="text-[#a1b0a6] hover:text-white cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMerchantRates} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">MDR Pix (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFeePixPercent}
                    onChange={(e) => setEditFeePixPercent(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Taxa Fixa Pix (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFeePixFixed}
                    onChange={(e) => setEditFeePixFixed(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Prazo Liquidação Pix (Dias)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="0 para D+0"
                    value={editSettlementPix}
                    onChange={(e) => setEditSettlementPix(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Taxa por Saque Pix (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFeePayout}
                    onChange={(e) => setEditFeePayout(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">MDR Cartão à Vista (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFeeCardPercent}
                    onChange={(e) => setEditFeeCardPercent(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">Prazo Cartão (Dias)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="14 para D+14"
                    value={editSettlementCard}
                    onChange={(e) => setEditSettlementCard(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingAction === "rates"}
                className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                {submittingAction === "rates" ? "Atualizando Taxas…" : "Salvar Novas Taxas da Operação"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR NOVO WEBHOOK */}
      {webhookModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00e66b]">
                  <Webhook className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Cadastrar Endpoint de Webhook</h3>
              </div>
              <button
                onClick={() => setWebhookModal(false)}
                className="text-[#a1b0a6] hover:text-white transition cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">
                  Operação / Merchant
                </label>
                <select
                  value={selectedWebhookMerchantId}
                  onChange={(e) => setSelectedWebhookMerchantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm text-white focus:border-[#00e66b] focus:outline-none cursor-pointer"
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.document ? `• ${m.document}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b5c6bb] mb-1.5">
                  URL de Callback (Endpoint HTTPS)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://sua-empresa.com/api/webhooks/axion-pay"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050c08] border border-[#213428] rounded-xl text-sm font-mono text-white focus:border-[#00e66b] focus:outline-none"
                />
                <span className="text-[11px] text-[#8b9f93] mt-1 block">
                  Seu servidor deve responder com status HTTP 2xx em até 8 segundos.
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#b5c6bb]">
                    Eventos a Monitorar
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedWebhookEvents.length === AVAILABLE_WEBHOOK_EVENTS.length) {
                        setSelectedWebhookEvents([]);
                      } else {
                        setSelectedWebhookEvents(AVAILABLE_WEBHOOK_EVENTS.map((e) => e.id));
                      }
                    }}
                    className="text-[11px] font-bold text-[#00e66b] hover:underline cursor-pointer"
                  >
                    {selectedWebhookEvents.length === AVAILABLE_WEBHOOK_EVENTS.length ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {AVAILABLE_WEBHOOK_EVENTS.map((ev) => {
                    const checked = selectedWebhookEvents.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                          checked
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-[#050c08] border-[#213428] opacity-75 hover:opacity-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWebhookEvent(ev.id)}
                          className="mt-0.5 accent-[#00e66b] cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-white block">{ev.label}</span>
                          <span className="text-[10px] font-mono text-emerald-400 block">{ev.id}</span>
                          <span className="text-[10px] text-[#8b9f93] block">{ev.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingAction === "create-webhook"}
                className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {submittingAction === "create-webhook" ? "Registrando Endpoint…" : "Salvar Endpoint de Webhook"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXIBIÇÃO DE SECRET GERADO */}
      {newWebhookSecretModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center text-[#00e66b]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Chave Secreta de Assinatura</h3>
                <p className="text-xs text-[#a1b0a6]">Endpoint cadastrado com sucesso</p>
              </div>
            </div>

            <p className="text-xs text-[#b5c6bb] leading-relaxed">
              Armazene esta chave de forma segura no seu servidor. Ela é utilizada para assinar cada requisição enviada ao seu webhook via cabeçalho <code className="text-white font-mono">X-Axion-Signature</code>.
            </p>

            <div className="p-4 rounded-xl bg-[#050c08] border border-[#213428] space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b9f93] block">
                Webhook Secret:
              </span>
              <code className="text-xs font-mono text-[#00e66b] break-all select-all block">
                {newWebhookSecretModal.secret}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newWebhookSecretModal.secret);
                  notify("success", "Chave secreta copiada!");
                }}
                className="flex-1 py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar Secret
              </button>
              <button
                type="button"
                onClick={() => setNewWebhookSecretModal(null)}
                className="px-5 py-3 bg-[#101d14] hover:bg-[#182b20] border border-[#30513d] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REQUEST INSPECTOR (API LOGS) */}
      {inspectedLog && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#213428] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    inspectedLog.method === "POST"
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      : inspectedLog.method === "GET"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {inspectedLog.method}
                  </span>
                  <h3 className="text-base font-bold font-mono text-white">{inspectedLog.path}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    inspectedLog.statusCode >= 200 && inspectedLog.statusCode < 300
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : inspectedLog.statusCode >= 400 && inspectedLog.statusCode < 500
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    HTTP {inspectedLog.statusCode}
                  </span>
                </div>
                <p className="text-xs text-[#8b9f93] font-mono">
                  {new Date(inspectedLog.createdAt).toLocaleString("pt-BR")} • Latência: {inspectedLog.latencyMs}ms • IP: {inspectedLog.ipAddress || "127.0.0.1"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="text-[#8b9f93] hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 border-b border-[#213428] pb-2 text-xs font-mono">
              {[
                { id: "general", label: "Visão Geral" },
                { id: "req_headers", label: "Request Headers" },
                { id: "req_body", label: "Request Body" },
                { id: "res_body", label: "Response Body" },
                { id: "curl", label: "Copiar cURL" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInspectedLogTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                    inspectedLogTab === tab.id
                      ? "bg-[#00e66b] text-black font-bold"
                      : "text-[#8b9f93] hover:text-white hover:bg-[#101d14]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {inspectedLogTab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] text-[#8b9f93] uppercase block">Log ID</span>
                    <span className="text-white select-all block">{inspectedLog.id}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] text-[#8b9f93] uppercase block">Idempotency Key</span>
                    <span className="text-white select-all block">{inspectedLog.idempotencyKey || "Nenhum header enviado"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] text-[#8b9f93] uppercase block">IP do Cliente</span>
                    <span className="text-white block">{inspectedLog.ipAddress || "127.0.0.1"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#050c08] border border-[#213428] space-y-1">
                    <span className="text-[10px] text-[#8b9f93] uppercase block">User-Agent</span>
                    <span className="text-white truncate block" title={inspectedLog.userAgent || ""}>
                      {inspectedLog.userAgent || "Não informado"}
                    </span>
                  </div>
                  {inspectedLog.errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 col-span-2 space-y-1">
                      <span className="text-[10px] uppercase font-bold block">Mensagem de Erro</span>
                      <span className="block">{inspectedLog.errorMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {inspectedLogTab === "req_headers" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#8b9f93]">Cabeçalhos Sanitizados:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(inspectedLog.requestHeaders, null, 2));
                        notify("success", "Headers copiados!");
                      }}
                      className="text-xs text-[#00e66b] font-mono flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Headers
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#050c08] border border-[#213428] font-mono text-xs text-[#00e66b] overflow-x-auto max-h-80 select-all">
                    {JSON.stringify(inspectedLog.requestHeaders, null, 2)}
                  </pre>
                </div>
              )}

              {inspectedLogTab === "req_body" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#8b9f93]">Corpo da Requisição (Sanitizado):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(inspectedLog.requestBody, null, 2));
                        notify("success", "Request body copiado!");
                      }}
                      className="text-xs text-[#00e66b] font-mono flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Body
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#050c08] border border-[#213428] font-mono text-xs text-[#00e66b] overflow-x-auto max-h-80 select-all">
                    {JSON.stringify(inspectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {inspectedLogTab === "res_body" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-[#8b9f93]">Resposta do Gateway:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(inspectedLog.responseBody, null, 2));
                        notify("success", "Response body copiado!");
                      }}
                      className="text-xs text-[#00e66b] font-mono flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Resposta
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#050c08] border border-[#213428] font-mono text-xs text-[#00e66b] overflow-x-auto max-h-80 select-all">
                    {JSON.stringify(inspectedLog.responseBody, null, 2)}
                  </pre>
                </div>
              )}

              {inspectedLogTab === "curl" && (
                <div className="space-y-2">
                  <span className="text-xs font-mono text-[#8b9f93]">Comando cURL pronto para reprodução:</span>
                  <div className="p-4 rounded-xl bg-[#050c08] border border-[#213428] space-y-3">
                    <pre className="font-mono text-xs text-[#00e66b] overflow-x-auto select-all whitespace-pre-wrap">
                      {`curl -X ${inspectedLog.method} "https://api.axionenterprise.cloud${inspectedLog.path}" \\
  -H "Authorization: Bearer axp_..." \\
  -H "Content-Type: application/json"${
    inspectedLog.idempotencyKey ? ` \\
  -H "Idempotency-Key: ${inspectedLog.idempotencyKey}"` : ""
  }${
    inspectedLog.method !== "GET" && inspectedLog.requestBody && Object.keys(inspectedLog.requestBody).length > 0
      ? ` \\
  -d '${JSON.stringify(inspectedLog.requestBody)}'`
      : ""
  }`}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `curl -X ${inspectedLog.method} "https://api.axionenterprise.cloud${inspectedLog.path}" -H "Authorization: Bearer axp_..." -H "Content-Type: application/json"${
                          inspectedLog.idempotencyKey ? ` -H "Idempotency-Key: ${inspectedLog.idempotencyKey}"` : ""
                        }${
                          inspectedLog.method !== "GET" && inspectedLog.requestBody && Object.keys(inspectedLog.requestBody).length > 0
                            ? ` -d '${JSON.stringify(inspectedLog.requestBody)}'`
                            : ""
                        }`;
                        navigator.clipboard.writeText(snippet);
                        notify("success", "Comando cURL copiado!");
                      }}
                      className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Comando cURL</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#213428]">
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="px-5 py-2.5 bg-[#101d14] hover:bg-[#182b20] border border-[#30513d] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUDITORIA DE ENTREGA / INSPEÇÃO DE PAYLOAD */}
      {inspectingDelivery && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl bg-[#09120d] border border-[#213428] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Inspeção de Payload & Entrega</h3>
                  <p className="text-xs text-[#a1b0a6] font-mono">
                    Evento: <span className="text-white">{inspectingDelivery.eventType}</span> • Status: {inspectingDelivery.statusCode || "Timeout"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingDelivery(null)}
                className="text-[#a1b0a6] hover:text-white transition cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#050c08] border border-[#213428]">
                  <span className="text-[10px] text-[#8b9f93] block">ID da Entrega</span>
                  <span className="text-white truncate block">{inspectingDelivery.id}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#050c08] border border-[#213428]">
                  <span className="text-[10px] text-[#8b9f93] block">Horário da Tentativa</span>
                  <span className="text-white block">{new Date(inspectingDelivery.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              </div>

              {inspectingDelivery.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  <span className="font-bold block">Erro retornado:</span>
                  {inspectingDelivery.error}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">Payload JSON Enviado:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(inspectingDelivery.payload, null, 2));
                      notify("success", "Payload copiado para a área de transferência!");
                    }}
                    className="text-xs text-[#00e66b] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar JSON
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#050c08] border border-[#213428] font-mono text-xs text-[#00e66b] overflow-x-auto max-h-64 select-all">
                  {JSON.stringify(inspectingDelivery.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingDelivery(null)}
                className="px-5 py-2.5 bg-[#101d14] hover:bg-[#182b20] border border-[#30513d] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
