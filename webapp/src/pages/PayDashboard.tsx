import React, { useState, useEffect } from "react";
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
  Sparkles,
  QrCode,
} from "lucide-react";

const AUTH_API = "https://auth.axionenterprise.cloud";
const API_BASE = "https://api.axionenterprise.cloud";

function getToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    sessionStorage.setItem("axion_token", urlToken);
    localStorage.removeItem("axion_token");
    params.delete("token");
    const newUrl =
      window.location.pathname +
      (params.toString() ? "?" + params.toString() : "") +
      window.location.hash;
    window.history.replaceState({}, "", newUrl);
    return urlToken;
  }

  const stored = sessionStorage.getItem("axion_token");
  if (stored) return stored;

  // Migra uma sessão antiga sem prolongá-la além da aba atual.
  const legacyToken = localStorage.getItem("axion_token");
  if (legacyToken) {
    sessionStorage.setItem("axion_token", legacyToken);
    localStorage.removeItem("axion_token");
    return legacyToken;
  }
  return null;
}

async function clearAuth() {
  sessionStorage.removeItem("axion_token");
  localStorage.removeItem("axion_token");
  try {
    await fetch(`${AUTH_API}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // A remoção local evita reutilizar token legado mesmo se o Auth estiver indisponível.
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...((options.headers as Record<string, string>) || {}) },
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: data?.error || data?.message || `HTTP ${res.status}` };
    }
    return data || { error: "Resposta vazia do servidor" };
  } catch (err: any) {
    return { error: "Erro de conexão com o servidor de pagamentos." };
  }
}

async function checkAuth() {
  const token = getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // The Core is the authorization boundary for this dashboard. Validating the
  // shared HttpOnly session here proves that the cookie reached the API and
  // that the API could validate it against Auth before any dashboard request.
  try {
    const res = await fetch(`${API_BASE}/v1/dashboard/me`, { headers, credentials: "include" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.user) return data.user;
  } catch {
    // A direct Auth check below keeps the login screen usable during a
    // transient Core restart, without storing or exposing a bearer token.
  }

  try {
    const res = await fetch(`${AUTH_API}/api/auth/me`, { headers, credentials: "include" });
    const data = await res.json().catch(() => null);
    return res.ok && data?.authenticated ? data.user : null;
  } catch {
    return null;
  }
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
          : "bg-zinc-800 text-zinc-400 border-zinc-700"
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-all border border-zinc-700 cursor-pointer"
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

export default function PayDashboard() {
  const [activeSection, setActiveSection] = useState<string>("overview");
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
  const [onboarding, setOnboarding] = useState<any>(null);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>(emptyOnboardingForm);
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

  const notify = (type: NonNullable<ToastState>["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

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
    checkAuth().then((authUser) => {
      if (authUser) {
        setUser(authUser);
        loadAllData();
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
      const [ovRes, mRes, kRes, txRes, intRes, stRes, onboardingRes] = await Promise.all([
        apiFetch("/v1/dashboard/overview"),
        apiFetch("/v1/dashboard/merchants"),
        apiFetch("/v1/dashboard/api-keys"),
        apiFetch("/v1/dashboard/transactions"),
        apiFetch("/v1/dashboard/integrations"),
        apiFetch("/v1/dashboard/settings"),
        apiFetch("/v1/dashboard/onboarding"),
      ]);

      if (ovRes && !ovRes.error) setOverview(ovRes);
      if (mRes?.merchants) setMerchants(mRes.merchants);
      if (kRes?.keys) setApiKeys(kRes.keys);
      if (txRes?.transactions) setTransactions(txRes.transactions);
      if (intRes && !intRes.error) setIntegrations(intRes);
      if (stRes?.settings) setSettings(stRes.settings);
      if (onboardingRes && !onboardingRes.error) {
        applyOnboardingProfile(onboardingRes.onboarding);
        const reviewer = Boolean(onboardingRes.canReviewKyc);
        setCanReviewKyc(reviewer);
        if (reviewer) {
          const reviewRes = await apiFetch("/v1/internal/kyc/applications?status=SUBMITTED");
          if (reviewRes?.applications) setKycApplications(reviewRes.applications);
        }
      }
    } catch (err: any) {
      setErrorMessage("Erro ao carregar dados do dashboard.");
    } finally {
      setLoadingData(false);
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
        notify("success", "Merchant cadastrado e isolado para esta organização.");
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
        setGeneratedKey(res.key.secret);
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
      if (res?.key) {
        setPendingRevoke(null);
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
      if (res?.settings) {
        notify("success", "Configurações salvas com sucesso.");
        await loadAllData();
      } else {
        notify("error", res?.error || "Não foi possível salvar as configurações.");
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
        body: JSON.stringify(onboardingForm),
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
    setSubmittingAction("onboarding-submit");
    try {
      const res = await apiFetch("/v1/dashboard/onboarding/submit", { method: "POST" });
      if (res?.onboarding) {
        applyOnboardingProfile(res.onboarding);
        notify("success", "KYC enviado para revisão. A emissão de chaves será liberada após aprovação.");
      } else {
        notify("error", res?.error || "Complete todos os campos obrigatórios antes de enviar o KYC.");
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

  // Se carregando autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#040407] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#e8b923] animate-spin" />
          <span className="text-xs font-mono text-zinc-400">Verificando sessão segura AXION...</span>
        </div>
      </div>
    );
  }

  // Falha Fechada (Fail-Closed): Se não logado, exibe tela de login oficial AXION Auth
  if (!user) {
    const returnUrl = encodeURIComponent(window.location.href);
    return (
      <div className="min-h-screen bg-[#040407] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#09090d]/90 border border-zinc-800 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#e8b923]/10 border border-[#e8b923]/20 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-[#e8b923]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Painel de Controle AxionPay</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Autenticação obrigatória. Faça login com sua conta corporativa AXION para acessar o gateway industrial.
            </p>
          </div>
          <a
            href={`${AUTH_API}/login?return_to=${returnUrl}`}
            className="w-full py-3.5 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar com AXION Single Sign-On</span>
          </a>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Visão Geral", icon: BarChart3 },
    { id: "merchants", label: "Merchants & Operações", icon: Building2 },
    { id: "api-keys", label: "Chaves de API", icon: Key },
    { id: "transactions", label: "Transações", icon: Wallet },
    { id: "onboarding", label: "Cadastro & KYC", icon: FileCheck2 },
    ...(canReviewKyc ? [{ id: "kyc-review", label: "Análise KYC", icon: Shield }] : []),
    { id: "integrations", label: "Integrações", icon: Globe },
    { id: "settings", label: "Configurações", icon: Settings },
  ];
  const canGenerateApiKeys = onboarding?.status === "APPROVED";

  return (
    <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans antialiased flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 h-screen bg-[#09090d] border-r border-zinc-800/80 z-40 flex flex-col justify-between transition-all duration-300 ${
          mobileOpen ? "left-0 w-64" : "-left-64 md:left-0"
        } ${collapsed ? "md:w-16" : "md:w-64"}`}
      >
        <div>
          <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-800/80">
            {(!collapsed || mobileOpen) && (
              <a href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#e8b923]/10 border border-[#e8b923]/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#e8b923]" />
                </div>
                <span className="text-base font-extrabold tracking-tight text-white">
                  Axion<span className="text-[#e8b923]">Pay</span>
                </span>
              </a>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSection === item.id
                    ? "bg-[#e8b923] text-black shadow-lg shadow-yellow-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* User Card no rodapé da Sidebar */}
        <div className="p-4 border-t border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-xs">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "AX"}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.name || "Usuário AXION"}</p>
                <p className="text-[10px] font-mono text-zinc-500 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={async () => {
                await clearAuth();
                window.location.reload();
              }}
              title="Sair"
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-16 px-6 border-b border-zinc-800/80 flex items-center justify-between bg-[#040407]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-white font-bold">PostgreSQL Core:</span>
              <span>api.axionenterprise.cloud (v1.0)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
            <a
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-[#e8b923]/10 border border-[#e8b923]/30 text-[#e8b923] hover:bg-[#e8b923]/20 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal da API</span>
            </a>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">
          {onboarding?.status !== "APPROVED" && (
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
                  <h1 className="text-2xl font-black text-white tracking-tight">Visão Geral do Gateway</h1>
                  <p className="text-xs text-zinc-400 mt-1">Métricas em tempo real confirmadas no banco PostgreSQL</p>
                </div>
                <button
                  onClick={() => setMerchantModal(true)}
                  className="px-4 py-2 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center gap-2 cursor-pointer w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Merchant</span>
                </button>
              </div>

              {/* Grid de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">Operações (Merchants)</span>
                  <div className="text-3xl font-extrabold text-white">{overview.merchants}</div>
                  <p className="text-[11px] text-zinc-400">Contas ativas vinculadas</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">Chaves de API Ativas</span>
                  <div className="text-3xl font-extrabold text-[#e8b923]">{overview.activeKeys}</div>
                  <p className="text-[11px] text-zinc-400">Credenciais com hash SHA-256</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">Transações Hoje</span>
                  <div className="text-3xl font-extrabold text-white">{overview.transactionsToday}</div>
                  <p className="text-[11px] text-zinc-400">Cobranças emitidas hoje</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500">Volume no Mês</span>
                  <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                    R$ {(overview.volumeMonthCents / 100).toFixed(2)}
                  </div>
                  <p className="text-[11px] text-zinc-400">Liquidação comprovada</p>
                </div>
              </div>

              {/* Tabela de Transações Recentes */}
              <div className="rounded-3xl bg-[#09090d] border border-zinc-800/80 p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white tracking-tight">Transações Recentes</h3>
                  <button
                    onClick={() => setActiveSection("transactions")}
                    className="text-xs text-[#e8b923] hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    Nenhuma transação registrada no banco até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase">
                          <th className="pb-3">ID / Correlation</th>
                          <th className="pb-3">Merchant</th>
                          <th className="pb-3">Valor</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {transactions.slice(0, 5).map((tx) => (
                          <tr key={tx.id} className="hover:bg-zinc-900/50 transition">
                            <td className="py-3 font-mono text-zinc-300 select-all">{tx.correlationId}</td>
                            <td className="py-3 font-semibold text-white">{tx.merchantName}</td>
                            <td className="py-3 font-mono font-bold text-white">
                              R$ {(tx.amountCents / 100).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={tx.status} />
                            </td>
                            <td className="py-3 text-zinc-400 font-mono">
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
                  <p className="text-xs text-zinc-400 mt-0.5">Segregação multi-tenant de cobranças e chaves de API</p>
                </div>
                <button
                  onClick={() => setMerchantModal(true)}
                  className="px-4 py-2 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Merchant</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {merchants.map((m) => (
                  <div
                    key={m.id}
                    className="p-6 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-4 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <Building className="w-5 h-5 text-[#e8b923]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{m.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-500 select-all">{m.id}</span>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="space-y-1 text-xs text-zinc-400 font-mono">
                      {m.document && <p>Documento: {m.document}</p>}
                      {m.billingEmail && <p>E-mail: {m.billingEmail}</p>}
                    </div>

                    <div className="pt-3 border-t border-zinc-800 flex justify-between items-center text-xs">
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
                        className="text-[#e8b923] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{canGenerateApiKeys ? "Gerar Chave de API" : "Concluir KYC"}</span>
                      </button>

                      <button
                        onClick={() => handleToggleMerchantStatus(m.id, m.status)}
                        className="text-xs text-zinc-400 hover:text-white cursor-pointer"
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
                  <p className="text-xs text-zinc-400 mt-0.5">Credenciais criptografadas para emissão de cobranças PIX</p>
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
                  className="px-4 py-2 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{canGenerateApiKeys ? "Nova Chave de API" : "Concluir KYC"}</span>
                </button>
              </div>

              <div className="rounded-3xl bg-[#09090d] border border-zinc-800/80 p-6 space-y-4 shadow-xl">
                {apiKeys.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    Nenhuma chave de API cadastrada.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase">
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
                          <tr key={k.id} className="hover:bg-zinc-900/50 transition">
                            <td className="py-3 font-bold text-white">{k.name}</td>
                            <td className="py-3 text-zinc-400">{k.merchantName}</td>
                            <td className="py-3 font-mono text-zinc-300">{k.keyPrefix}...</td>
                            <td className="py-3 font-mono text-[11px] text-zinc-400">
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
                <p className="text-xs text-zinc-400 mt-0.5">Todas as intenções de pagamento registradas no PostgreSQL</p>
              </div>

              <div className="rounded-3xl bg-[#09090d] border border-zinc-800/80 p-6 space-y-4 shadow-xl">
                {transactions.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                    Nenhuma transação registrada no banco até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase">
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
                          <tr key={tx.id} className="hover:bg-zinc-900/50 transition">
                            <td className="py-3 font-mono text-zinc-300 select-all">{tx.correlationId}</td>
                            <td className="py-3 font-semibold text-white">{tx.merchantName}</td>
                            <td className="py-3 font-mono font-bold text-[#e8b923]">
                              R$ {(tx.amountCents / 100).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={tx.status} />
                            </td>
                            <td className="py-3 font-mono text-zinc-400">{tx.provider}</td>
                            <td className="py-3 text-zinc-400 font-mono">
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

          {/* TAB 5: CADASTRO E KYC */}
          {activeSection === "onboarding" && (
            <div className="space-y-6 animate-fadeIn max-w-3xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Cadastro da organização & KYC</h1>
                  <p className="mt-0.5 text-xs text-zinc-400">Dados usados para abrir sua operação no gateway. O documento completo não é armazenado pelo AXION Pay.</p>
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
                <form onSubmit={handleSaveOnboarding} className="space-y-5 rounded-3xl border border-zinc-800/80 bg-[#09090d] p-6 shadow-xl">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">Tipo de cadastro</label>
                      <select
                        value={onboardingForm.legalEntityType}
                        onChange={(e) => setOnboardingForm({ ...onboardingForm, legalEntityType: e.target.value as OnboardingForm["legalEntityType"] })}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none"
                      >
                        <option value="BUSINESS">Pessoa jurídica</option>
                        <option value="INDIVIDUAL">Pessoa física</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">País</label>
                      <input value={onboardingForm.countryCode} maxLength={2} onChange={(e) => setOnboardingForm({ ...onboardingForm, countryCode: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">{onboardingForm.legalEntityType === "BUSINESS" ? "Razão social" : "Nome completo"}</label>
                      <input required value={onboardingForm.legalName} onChange={(e) => setOnboardingForm({ ...onboardingForm, legalName: e.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">Nome fantasia (opcional)</label>
                      <input value={onboardingForm.tradingName} onChange={(e) => setOnboardingForm({ ...onboardingForm, tradingName: e.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">CPF ou CNPJ</label>
                      <input required inputMode="numeric" value={onboardingForm.documentNumber} onChange={(e) => setOnboardingForm({ ...onboardingForm, documentNumber: e.target.value })} placeholder="Somente usado para hash e verificação" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                      {onboarding?.documentLastFour && <p className="mt-1 text-[11px] text-zinc-500">Documento salvo com final {onboarding.documentLastFour}.</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">Telefone em formato internacional</label>
                      <input required type="tel" value={onboardingForm.phoneE164} onChange={(e) => setOnboardingForm({ ...onboardingForm, phoneE164: e.target.value })} placeholder="+5511999999999" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">E-mail financeiro</label>
                      <input required type="email" value={onboardingForm.billingEmail} onChange={(e) => setOnboardingForm({ ...onboardingForm, billingEmail: e.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-300">Site (opcional)</label>
                      <input type="url" value={onboardingForm.websiteUrl} onChange={(e) => setOnboardingForm({ ...onboardingForm, websiteUrl: e.target.value })} placeholder="https://" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-300">Atividade e uso previsto do gateway</label>
                    <textarea required minLength={10} maxLength={1000} value={onboardingForm.businessDescription} onChange={(e) => setOnboardingForm({ ...onboardingForm, businessDescription: e.target.value })} className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-300">
                    <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={onboardingForm.acceptTerms} onChange={(e) => setOnboardingForm({ ...onboardingForm, acceptTerms: e.target.checked })} className="mt-0.5" /><span>Aceito os termos de uso do gateway e confirmo que possuo poderes para cadastrar esta operação.</span></label>
                    <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={onboardingForm.acceptPrivacy} onChange={(e) => setOnboardingForm({ ...onboardingForm, acceptPrivacy: e.target.checked })} className="mt-0.5" /><span>Li a política de privacidade e autorizo o tratamento dos dados estritamente para prevenção a fraude, compliance e KYC.</span></label>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button type="submit" disabled={submittingAction === "onboarding-save"} className="rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60">{submittingAction === "onboarding-save" ? "Salvando…" : "Salvar cadastro"}</button>
                    <button type="button" onClick={handleSubmitOnboarding} disabled={submittingAction === "onboarding-submit"} className="rounded-xl bg-[#e8b923] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-black transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{submittingAction === "onboarding-submit" ? "Enviando…" : "Enviar para revisão KYC"}</button>
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
                  <p className="mt-0.5 text-xs text-zinc-400">Somente dados minimizados são exibidos. Cada decisão gera trilha de auditoria.</p>
                </div>
                <button type="button" onClick={loadAllData} disabled={loadingData} className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} aria-hidden="true" />Atualizar</button>
              </div>
              <div className="overflow-x-auto rounded-3xl border border-zinc-800/80 bg-[#09090d] p-2 shadow-xl">
                {kycApplications.length === 0 ? (
                  <div className="py-14 text-center text-xs font-mono text-zinc-500">Não há solicitações KYC pendentes.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-zinc-800 text-[10px] font-mono uppercase tracking-wider text-zinc-500"><th className="px-4 py-3">Titular</th><th className="px-4 py-3">Organização</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Enviado</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {kycApplications.map((application) => (
                        <tr key={application.authUserId} className="transition hover:bg-zinc-900/60">
                          <td className="px-4 py-3"><p className="font-bold text-white">{application.userDisplayName || "Titular AXION"}</p><p className="mt-0.5 text-zinc-500">{application.userEmail}</p></td>
                          <td className="px-4 py-3 text-zinc-200">{application.legalName}</td>
                          <td className="px-4 py-3 font-mono text-zinc-400">•••• {application.documentLastFour}</td>
                          <td className="px-4 py-3 text-zinc-400">{application.submittedAt ? new Date(application.submittedAt).toLocaleString("pt-BR") : "—"}</td>
                          <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setKycReviewModal(application); setKycReviewStatus("IN_REVIEW"); setKycReviewReason(""); }} className="rounded-lg border border-[#e8b923]/40 px-3 py-1.5 text-xs font-bold text-[#e8b923] transition hover:bg-[#e8b923]/10">Analisar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: INTEGRAÇÕES */}
          {activeSection === "integrations" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Integrações & Endpoints</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Parâmetros de conexão do gateway industrial</p>
              </div>

              <div className={`rounded-2xl border p-5 ${integrations?.paymentsEnabled ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                <div className="flex items-start gap-3">
                  {integrations?.paymentsEnabled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
                  <div>
                    <p className="text-sm font-bold text-white">{integrations?.paymentsEnabled ? "PIX operacional" : "PIX aguardando ativação"}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-300">
                      {integrations?.paymentsEnabled
                        ? `Provedor ${String(integrations.provider || "Woovi")} ativo. As cobranças podem ser criadas pela API autenticada.`
                        : "As rotas estão documentadas, mas a criação de cobranças retorna 503 até a configuração segura da credencial Woovi."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-[#e8b923]" />
                    <h3 className="text-sm font-bold text-white">Endpoint de Criação de Cobranças</h3>
                  </div>
                  <code className="block p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-[#e8b923] select-all">
                    POST https://api.axionenterprise.cloud/v1/charges
                  </code>
                  <div className="space-y-2 text-xs text-zinc-400 font-mono">
                    <p>Header: <span className="text-white">Idempotency-Key: &lt;uuid&gt;</span></p>
                    <p>Header: <span className="text-white">Authorization: Bearer axp_live_...</span></p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Endpoint de Webhook (Woovi/OpenPix)</h3>
                  </div>
                  <code className="block p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-400 select-all">
                    POST https://api.axionenterprise.cloud/webhooks/woovi
                  </code>
                  <div className="space-y-2 text-xs text-zinc-400 font-mono">
                    <p>Header: <span className="text-white">x-webhook-signature: &lt;RSA-SHA256 signature&gt;</span></p>
                    <p>Trilho: <span className="text-white">Deduplicação atômica em PostgreSQL</span></p>
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
                <p className="text-xs text-zinc-400 mt-0.5">Definições da organização</p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#09090d] border border-zinc-800/80 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome da Organização</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: AXION Enterprise LTDA"
                    value={settings.organizationName || ""}
                    onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingAction === "settings"}
                  className="px-5 py-2.5 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                  {submittingAction === "settings" ? "Salvando…" : "Salvar Configurações"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-zinc-700 bg-[#18181f]/95 p-4 shadow-2xl backdrop-blur" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            {toast.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" /> : toast.type === "error" ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" /> : <Activity className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />}
            <p className="flex-1 text-sm leading-5 text-zinc-100">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} aria-label="Fechar notificação" className="text-zinc-500 transition hover:text-white"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      )}

      {pendingRevoke && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingAction) setPendingRevoke(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="revoke-title" aria-describedby="revoke-description" className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[#09090d] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"><Trash2 className="h-5 w-5" aria-hidden="true" /></div>
              <div>
                <h2 id="revoke-title" className="text-base font-bold text-white">Revogar chave de API?</h2>
                <p id="revoke-description" className="mt-2 text-sm leading-6 text-zinc-400">A chave “{pendingRevoke.name}” deixará de funcionar imediatamente. Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingRevoke(null)} disabled={Boolean(submittingAction)} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => handleRevokeApiKey(pendingRevoke.id)} disabled={submittingAction === `revoke-${pendingRevoke.id}`} className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60">{submittingAction === `revoke-${pendingRevoke.id}` ? "Revogando…" : "Revogar chave"}</button>
            </div>
          </section>
        </div>
      )}

      {kycReviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingAction) setKycReviewModal(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="kyc-review-title" className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-[#09090d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="kyc-review-title" className="text-base font-bold text-white">Analisar solicitação KYC</h2><p className="mt-1 text-xs text-zinc-400">{kycReviewModal.legalName} · documento final {kycReviewModal.documentLastFour}</p></div>
              <button type="button" onClick={() => setKycReviewModal(null)} disabled={Boolean(submittingAction)} aria-label="Fechar análise KYC" className="text-zinc-500 transition hover:text-white"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-zinc-500">E-mail</p><p className="mt-1 break-all text-zinc-200">{kycReviewModal.billingEmail}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-zinc-500">Telefone</p><p className="mt-1 text-zinc-200">{kycReviewModal.phoneE164}</p></div></div>
              <div><label className="mb-1.5 block text-xs font-medium text-zinc-300">Decisão</label><select value={kycReviewStatus} onChange={(e) => setKycReviewStatus(e.target.value as typeof kycReviewStatus)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none"><option value="IN_REVIEW">Manter em revisão</option><option value="ACTION_REQUIRED">Solicitar ajustes</option><option value="APPROVED">Aprovar organização</option><option value="REJECTED">Rejeitar solicitação</option></select></div>
              <div><label className="mb-1.5 block text-xs font-medium text-zinc-300">Motivo {(["ACTION_REQUIRED", "REJECTED"].includes(kycReviewStatus) ? "(obrigatório)" : "(opcional)"}</label><textarea value={kycReviewReason} onChange={(e) => setKycReviewReason(e.target.value)} maxLength={1000} className="min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white focus:border-[#e8b923] focus:outline-none" /></div>
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100/80">A decisão é registrada com seu usuário AXION e pode liberar ou bloquear imediatamente novas chaves de API do solicitante.</p>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setKycReviewModal(null)} disabled={Boolean(submittingAction)} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50">Cancelar</button><button type="button" onClick={handleReviewKyc} disabled={submittingAction === "kyc-review"} className="rounded-xl bg-[#e8b923] px-4 py-2.5 text-xs font-extrabold text-black transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{submittingAction === "kyc-review" ? "Registrando…" : "Registrar decisão"}</button></div>
          </section>
        </div>
      )}

      {/* MODAL NOVO MERCHANT */}
      {merchantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#09090d] border border-zinc-800 rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Cadastrar Novo Merchant</h3>
              <button onClick={() => setMerchantModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMerchant} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome da Operação / Loja</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: AXION Cloud Services"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">CNPJ / CPF (Opcional)</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={newMerchantDoc}
                  onChange={(e) => setNewMerchantDoc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">E-mail Financeiro (Opcional)</label>
                <input
                  type="email"
                  placeholder="financeiro@empresa.com"
                  value={newMerchantEmail}
                  onChange={(e) => setNewMerchantEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction === "merchant"}
                className="w-full py-3 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
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
          <div className="w-full max-w-md bg-[#09090d] border border-zinc-800 rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Gerar Chave de API</h3>
              <button
                onClick={() => {
                  setApiKeyModal(false);
                  setGeneratedKey(null);
                }}
                className="text-zinc-400 hover:text-white"
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

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-[#e8b923] select-all break-all">{generatedKey}</code>
                  <CopyBtn text={generatedKey} />
                </div>

                <button
                  onClick={() => {
                    setApiKeyModal(false);
                    setGeneratedKey(null);
                  }}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Merchant Vinculado</label>
                  <select
                    value={keyMerchantId}
                    onChange={(e) => setKeyMerchantId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:border-[#e8b923] focus:outline-none"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Identificador da Chave</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Produção Backend Flow"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAction === "api-key"}
                  className="w-full py-3 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                  {submittingAction === "api-key" ? "Gerando…" : "Gerar Chave Segura"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
