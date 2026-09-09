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
  "transactions": "transactions",
  "payouts": "payouts",
  "saques": "payouts",
  "onboarding": "onboarding",
  "kyc": "onboarding",
  "kyc-review": "kyc-review",
  "kyc-applications": "kyc-review",
  "billing": "billing",
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
      if (m?.merchants) setMerchants(m.merchants);
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

          {/* TAB 7: INTEGRAÇÕES */}
          {activeSection === "integrations" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Integrações & Endpoints</h1>
                <p className="text-xs text-[#a1b0a6] mt-0.5">Parâmetros de conexão do gateway industrial</p>
              </div>

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

          {/* TAB 7: CONFIGURAÇÕES */}
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
    </div>
  );
}
