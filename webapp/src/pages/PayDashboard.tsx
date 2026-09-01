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
  const [settings, setSettings] = useState<{ organizationName: string | null }>({
    organizationName: null,
  });

  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modais de Criação
  const [merchantModal, setMerchantModal] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState("");
  const [newMerchantDoc, setNewMerchantDoc] = useState("");
  const [newMerchantEmail, setNewMerchantEmail] = useState("");

  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [keyMerchantId, setKeyMerchantId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

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

  const loadAllData = async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const [ovRes, mRes, kRes, txRes, intRes, stRes] = await Promise.all([
        apiFetch("/v1/dashboard/overview"),
        apiFetch("/v1/dashboard/merchants"),
        apiFetch("/v1/dashboard/api-keys"),
        apiFetch("/v1/dashboard/transactions"),
        apiFetch("/v1/dashboard/integrations"),
        apiFetch("/v1/dashboard/settings"),
      ]);

      if (ovRes && !ovRes.error) setOverview(ovRes);
      if (mRes?.merchants) setMerchants(mRes.merchants);
      if (kRes?.keys) setApiKeys(kRes.keys);
      if (txRes?.transactions) setTransactions(txRes.transactions);
      if (intRes && !intRes.error) setIntegrations(intRes);
      if (stRes?.settings) setSettings(stRes.settings);
    } catch (err: any) {
      setErrorMessage("Erro ao carregar dados do dashboard.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantName.trim()) return;
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
      loadAllData();
    } else {
      alert(res?.error || "Falha ao cadastrar merchant.");
    }
  };

  const handleToggleMerchantStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await apiFetch(`/v1/dashboard/merchants/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res?.merchant) {
      loadAllData();
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyMerchantId || !keyName.trim()) return;
    const res = await apiFetch("/v1/dashboard/api-keys", {
      method: "POST",
      body: JSON.stringify({
        merchantId: keyMerchantId,
        name: keyName.trim(),
      }),
    });
    if (res?.key) {
      setGeneratedKey(res.key.secret);
      loadAllData();
    } else {
      alert(res?.error || "Falha ao gerar chave de API.");
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!window.confirm("Deseja realmente revogar esta chave de API? Aplicações usando esta chave pararão de funcionar imediatamente.")) return;
    const res = await apiFetch(`/v1/dashboard/api-keys/${id}/revoke`, {
      method: "POST",
    });
    if (res?.key) {
      loadAllData();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const org = settings.organizationName?.trim();
    if (!org) return;
    const res = await apiFetch("/v1/dashboard/settings", {
      method: "POST",
      body: JSON.stringify({ organizationName: org }),
    });
    if (res?.settings) {
      alert("Configurações salvas com sucesso!");
      loadAllData();
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
    { id: "integrations", label: "Integrações", icon: Globe },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

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
                          setKeyMerchantId(m.id);
                          setApiKeyModal(true);
                        }}
                        className="text-[#e8b923] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Gerar Chave de API</span>
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
                    if (merchants.length > 0) setKeyMerchantId(merchants[0].id);
                    setApiKeyModal(true);
                  }}
                  className="px-4 py-2 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Chave de API</span>
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
                                  onClick={() => handleRevokeApiKey(k.id)}
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

          {/* TAB 5: INTEGRAÇÕES */}
          {activeSection === "integrations" && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Integrações & Endpoints</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Parâmetros de conexão do gateway industrial</p>
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
                    <p>Header: <span className="text-white">x-webhook-signature: &lt;hmac-signature&gt;</span></p>
                    <p>Trilho: <span className="text-white">Deduplicação atômica em PostgreSQL</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CONFIGURAÇÕES */}
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
                  className="px-5 py-2.5 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                  Salvar Configurações
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

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
                className="w-full py-3 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
              >
                Confirmar Cadastro
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
                  className="w-full py-3 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                  Gerar Chave Segura
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
