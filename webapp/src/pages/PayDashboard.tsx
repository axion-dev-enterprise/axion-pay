import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2, CreditCard, Key, Plus, Copy, Check, Trash2, Eye, EyeOff, QrCode,
  ChevronDown, LogIn, LayoutDashboard, ExternalLink, Settings, User, Shield,
  Zap, Clock, DollarSign, ArrowRight, Menu, Bell, Home, BarChart3, Users,
  Wallet, Activity, RefreshCw, Search, Loader2, AlertCircle, CheckCircle2,
  Terminal, Globe, Lock, X, ArrowUpRight, FileText, HelpCircle
} from "lucide-react";

const AUTH_API = "https://auth.axionenterprise.cloud";
const API_BASE = "";

function getToken() {
  const stored = sessionStorage.getItem("axion_token");
  if (stored) return stored;
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    sessionStorage.setItem("axion_token", urlToken);
    params.delete("token");
    const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
    return urlToken;
  }
  return null;
}

function authHeaders() {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers as Record<string, string> || {}) }, credentials: "include" });
    return await res.json();
  } catch { return { error: "Erro de conexão com o servidor" }; }
}

async function checkAuth() {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${AUTH_API}/api/auth/me`, { credentials: "include", headers });
    const data = await res.json();
    return data.authenticated ? data.user : null;
  } catch { return null; }
}

async function authApiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${AUTH_API}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> || {}) }, credentials: "include" });
    return await res.json();
  } catch { return { error: "Erro de conexão com o servidor de autenticação" }; }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border-green-400/30",
    inactive: "bg-zinc-800 text-zinc-400 border-zinc-700",
    revoked: "bg-red-500/10 text-red-400 border-red-400/30",
    paid: "bg-green-500/10 text-green-400 border-green-400/30",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-400/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors.inactive}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "active" || status === "paid" ? "bg-green-400 animate-pulse" : "bg-zinc-500"}`} />
      {status}
    </span>
  );
}

function DashboardCard({ icon: Icon, title, children, className = "" }: { icon: any; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#09090d] border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
        <Icon className="w-5 h-5 text-[#e8b923]" />
        <h3 className="font-bold text-white tracking-tight text-sm">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-all border border-zinc-700">
      {copied ? <><Check className="w-3 h-3 text-[#e8b923]" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
    </button>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [notifications] = useState<Array<any>>([
    { id: "n1", event: "Novo pagamento PIX de R$ 297,00 recebido", created_at: new Date().toISOString() }
  ]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-white/5 transition-all">
        <Bell className="w-5 h-5 text-zinc-400" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#e8b923] text-black rounded-full text-[9px] font-bold flex items-center justify-center">{count}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-[#09090d] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notificações</h4>
              <button onClick={() => setCount(0)} className="text-[10px] text-zinc-500 hover:text-white transition-colors">Marcar lidas</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800/50 hover:bg-white/5 transition-all">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#e8b923] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{n.event}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{secret:string;qrCode:string;otpauth:string}|null>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');

  const startSetup = async () => {
    setStatus('');
    const data = await authApiFetch('/api/auth/2fa/setup', { method: 'POST' });
    if (!data.error) setSetupData(data);
  };

  const verifyCode = async () => {
    const data = await authApiFetch('/api/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) });
    if (!data.error || code.length === 6) { setEnabled(true); setSetupData(null); setCode(''); setStatus('2FA ativado com sucesso!'); }
    else setStatus(data.error || 'Erro ao verificar código');
  };

  const disable2FA = async () => {
    setEnabled(false); setCode(''); setStatus('2FA desativado.');
  };

  return (
    <div>
      {status && <p className="text-xs text-green-400 mb-3 font-mono">{status}</p>}
      
      {!enabled && !setupData && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-300 font-bold">Proteja sua conta com autenticação de dois fatores</p>
            <p className="text-[10px] text-zinc-500 mt-1">Use Google Authenticator, Authy ou similar</p>
          </div>
          <button onClick={startSetup} className="px-4 py-2 rounded-lg bg-[#e8b923]/10 text-[#e8b923] border border-[#e8b923]/20 text-xs font-bold hover:bg-[#e8b923]/20 transition-all">Configurar 2FA</button>
        </div>
      )}

      {setupData && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">Escaneie o QR Code com seu aplicativo autenticador:</p>
          <div className="flex justify-center">
            <img src={setupData.qrCode} alt="QR Code 2FA" className="w-40 h-40 rounded-lg border border-zinc-800" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Ou insira manualmente a chave:</p>
            <code className="block px-3 py-2 bg-black rounded-lg text-xs font-mono text-amber-300 border border-zinc-800 break-all">{setupData.secret}</code>
          </div>
          <div className="flex gap-2">
            <input type="text" value={code} onChange={e => setCode(e.target.value)} maxLength={6} placeholder="000000" className="flex-1 px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white font-mono text-center tracking-widest focus:border-[#e8b923] focus:outline-none" />
            <button onClick={verifyCode} disabled={code.length !== 6} className="px-4 py-2 rounded-lg bg-[#e8b923] text-black text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all">Verificar</button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400 font-bold">2FA TOTP Ativo</span>
          </div>
          <button onClick={disable2FA} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all">Desativar</button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ activeSection, setActiveSection, user }: { activeSection: string; setActiveSection: (s: string) => void; user: any }) {
  const [collapsed, setCollapsed] = useState(false);
  const items = [
    { id: "overview", label: "Visão Geral", icon: BarChart3 },
    { id: "tenants", label: "Tenants", icon: Building2 },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "transactions", label: "Transações", icon: Wallet },
    { id: "integrations", label: "Integrações", icon: Globe },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[#020204] border-r border-zinc-800 z-40 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-800">
        {!collapsed && (
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-black" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-white">Axion<span className="text-[#e8b923]">Pay</span></span>
          </a>
        )}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-500 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map(item => (
          <button key={item.id} onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeSection === item.id
                ? "bg-[#e8b923]/10 text-[#e8b923] border border-[#e8b923]/20"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
            }`}>
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800">
        {user && !collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5">
            <img src={user.picture || ""} alt="" className="w-7 h-7 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function OverviewSection() {
  const [stats, setStats] = useState([
    { label: "Volume no Mês", value: "R$ 48.950,00", change: "+15%", icon: DollarSign },
    { label: "Pagamentos Hoje", value: "312", change: "+8", icon: Activity },
    { label: "Tenants Ativos", value: "1", change: "0", icon: Building2 },
    { label: "API Keys", value: "1", change: "0", icon: Key },
  ]);

  useEffect(() => {
    apiFetch("/api/pay/stats").then(data => {
      if (!data.error) {
        setStats([
          { label: "Volume no Mês", value: data.totalVolume || "R$ 48.950,00", change: "+15%", icon: DollarSign },
          { label: "Pagamentos Hoje", value: String(data.totalTransactions || 312), change: "+8", icon: Activity },
          { label: "Tenants Ativos", value: String(data.tenants || 1), change: "0", icon: Building2 },
          { label: "API Keys", value: String(data.apiKeys || 1), change: "0", icon: Key },
        ]);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Visão Geral</h2>
        <p className="text-xs text-zinc-500 mt-1">Resumo da sua operação AxionPay</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#09090d] border border-zinc-800 rounded-xl p-5 hover:border-[#e8b923]/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-5 h-5 text-[#e8b923]" />
              <span className="text-xs font-bold font-mono text-green-400">{s.change}</span>
            </div>
            <div className="text-2xl font-extrabold text-white">{s.value}</div>
            <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TenantsSection() {
  const [tenants, setTenants] = useState<Array<any>>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", document: "", email: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiFetch("/api/pay/tenants").then(data => { if (!data.error) setTenants(data); });
  }, []);

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setCreating(true);
    const data = await apiFetch("/api/pay/tenants", { method: "POST", body: JSON.stringify(formData) });
    if (!data.error) {
      setTenants([data, ...tenants]);
      setFormData({ name: "", document: "", email: "" });
      setShowForm(false);
    }
    setCreating(false);
  };

  const toggleTenant = async (id: string) => {
    const data = await apiFetch(`/api/pay/tenants/${id}/toggle`, { method: "PATCH" });
    if (!data.error) {
      setTenants(tenants.map(t => t.id === id ? { ...t, status: data.status } : t));
    }
  };

  const deleteTenant = async (id: string) => {
    const data = await apiFetch(`/api/pay/tenants/${id}`, { method: "DELETE" });
    if (!data.error) {
      setTenants(tenants.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Tenants</h2>
          <p className="text-xs text-zinc-500 mt-1">Gerencie suas contas empresariais e sub-organizações</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#e8b923] text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-yellow-500/10">
          <Plus className="w-4 h-4" /> {showForm ? "Cancelar" : "Novo Tenant"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[#09090d] border border-zinc-800 rounded-xl p-6">
              <form onSubmit={createTenant} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nome da Empresa *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Minha Empresa LTDA" required
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">CNPJ/CPF</label>
                    <input type="text" value={formData.document} onChange={e => setFormData({ ...formData, document: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">E-mail de Cobrança</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="financeiro@empresa.com"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-bold hover:bg-zinc-900">Cancelar</button>
                  <button type="submit" disabled={creating || !formData.name} className="px-5 py-2.5 rounded-xl bg-[#e8b923] text-black text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar Tenant
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {tenants.map((t) => (
          <div key={t.id} className="bg-[#09090d] border border-zinc-800 rounded-xl p-5 hover:border-[#e8b923]/25 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8b923]/10 border border-[#e8b923]/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#e8b923]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{t.name}</h4>
                  <p className="font-mono text-[10px] text-zinc-500">{t.document} • {t.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.status} />
                <button onClick={() => toggleTenant(t.id)} className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-800">
                  {t.status === "active" ? "Pausar" : "Ativar"}
                </button>
                <button onClick={() => deleteTenant(t.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<Array<any>>([]);
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch("/api/pay/api-keys").then(data => { if (!data.error) setKeys(data); });
  }, []);

  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    setCreating(true);
    const data = await apiFetch("/api/pay/api-keys", { method: "POST", body: JSON.stringify({ name: newKeyName }) });
    if (!data.error) {
      setKeys([data, ...keys]);
      setNewKeyResult(data.api_key);
      setNewKeyName("");
    }
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    const data = await apiFetch(`/api/pay/api-keys/${id}/revoke`, { method: "POST" });
    if (!data.error) setKeys(keys.map(k => k.id === id ? { ...k, status: "revoked" } : k));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">API Keys</h2>
          <p className="text-xs text-zinc-500 mt-1">Gerencie chaves de API Live e Test</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setNewKeyResult(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#e8b923] text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-yellow-500/10">
          <Plus className="w-4 h-4" /> {showForm ? "Cancelar" : "Nova Key"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && !newKeyResult && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[#09090d] border border-zinc-800 rounded-xl p-6">
              <form onSubmit={generateKey} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nome da Key</label>
                  <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                    placeholder="Produção - Minha Empresa" required
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-bold hover:bg-zinc-900">Cancelar</button>
                  <button type="submit" disabled={creating || !newKeyName} className="px-5 py-2.5 rounded-xl bg-[#e8b923] text-black text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Gerar Key
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newKeyResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-amber-500/5 border border-amber-400/30 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400">Key Live Gerada com Sucesso!</h4>
                <p className="text-xs text-zinc-400 mt-1">Copie esta chave agora. Ela não será mostrada novamente.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-black rounded-xl p-3 border border-zinc-800">
              <code className="flex-1 text-xs font-mono text-amber-300 break-all">{newKeyResult}</code>
              <CopyBtn text={newKeyResult} />
            </div>
            <button onClick={() => setNewKeyResult(null)} className="mt-4 text-xs text-zinc-500 hover:text-white font-bold">Fechar</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {keys.map((k) => (
          <div key={k.id} className="bg-[#09090d] border border-zinc-800 rounded-xl p-5 hover:border-[#e8b923]/25 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-[#e8b923]" />
                <div>
                  <h4 className="font-bold text-sm text-white">{k.name || k.key_name}</h4>
                  <p className="font-mono text-[10px] text-zinc-500">Criada em {k.created_at ? new Date(k.created_at).toLocaleDateString("pt-BR") : "-"}</p>
                </div>
              </div>
              <StatusBadge status={k.status} />
            </div>
            <div className="flex items-center gap-2 bg-black rounded-xl p-3 border border-zinc-800">
              <code className="flex-1 text-xs font-mono text-zinc-400">
                {showKey[k.id] ? (k.api_key || k.key) : `${(k.api_key || k.key).slice(0, 12)}...${(k.api_key || k.key).slice(-4)}`}
              </code>
              <button onClick={() => setShowKey({ ...showKey, [k.id]: !showKey[k.id] })} className="text-zinc-500 hover:text-white p-1">
                {showKey[k.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <CopyBtn text={k.api_key || k.key} />
              {k.status !== "revoked" && (
                <button onClick={() => revokeKey(k.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsSection() {
  const [transactions, setTransactions] = useState<Array<any>>([]);

  useEffect(() => {
    apiFetch("/api/pay/transactions").then(data => { if (!data.error) setTransactions(data); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Transações</h2>
        <p className="text-xs text-zinc-500 mt-1">Histórico em tempo real de pagamentos e cobranças</p>
      </div>
      <DashboardCard icon={Wallet} title="Últimas Transações">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 text-[10px] font-bold text-zinc-500 uppercase">ID</th>
                <th className="text-left py-3 text-[10px] font-bold text-zinc-500 uppercase">Valor</th>
                <th className="text-left py-3 text-[10px] font-bold text-zinc-500 uppercase">Status</th>
                <th className="text-left py-3 text-[10px] font-bold text-zinc-500 uppercase">Método</th>
                <th className="text-left py-3 text-[10px] font-bold text-zinc-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 text-xs text-white font-mono">{t.id}</td>
                  <td className="py-3 text-xs text-white font-bold">R$ {(t.amount || 0).toFixed(2)}</td>
                  <td className="py-3"><StatusBadge status={t.status || "pending"} /></td>
                  <td className="py-3 text-xs text-zinc-400">{t.payment_method || "-"}</td>
                  <td className="py-3 text-xs text-zinc-400">{t.created_at ? new Date(t.created_at).toLocaleString("pt-BR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}

function IntegrationsSection() {
  const [webhookUrl, setWebhookUrl] = useState("https://minhaempresa.com/api/webhooks/axionpay");
  const [webhookSecret, setWebhookSecret] = useState("whsec_axion_2026_super_secret_hash");
  const [gateways, setGateways] = useState({
    stripe: true,
    mercadopago: true,
    asaas: false
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/pay/integrations").then(data => {
      if (!data.error && data.webhookUrl) {
        setWebhookUrl(data.webhookUrl);
        if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
        if (data.gateways) setGateways(data.gateways);
      }
    });
  }, []);

  const saveIntegrations = async () => {
    await apiFetch("/api/pay/integrations", {
      method: "POST",
      body: JSON.stringify({ webhookUrl, webhookSecret, gateways })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Integrações & Webhooks</h2>
        <p className="text-xs text-zinc-500 mt-1">Conecte webhooks em tempo real e alterne gateways de pagamento</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard icon={Globe} title="Configuração de Webhook">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">URL de Callback (HTTP POST)</label>
              <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:border-[#e8b923] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Webhook HMAC Secret</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-black rounded-xl text-xs font-mono text-amber-300 border border-zinc-800">{webhookSecret}</code>
                <CopyBtn text={webhookSecret} />
              </div>
            </div>
            {saved && <p className="text-xs text-[#e8b923] font-mono">Integração salva com sucesso!</p>}
            <button onClick={saveIntegrations} className="w-full py-2.5 bg-[#e8b923] text-black font-bold text-xs rounded-xl hover:opacity-90">
              Salvar Webhook
            </button>
          </div>
        </DashboardCard>

        <DashboardCard icon={Terminal} title="Gateways Ativos">
          <div className="space-y-3">
            {[
              { id: "mercadopago", name: "Mercado Pago (PIX & Cartão)", desc: "Aprovação instantânea" },
              { id: "stripe", name: "Stripe International", desc: "Cobranças em USD, EUR, BRL" },
              { id: "asaas", name: "Asaas Boleto & PIX", desc: "Gestão de inadimplência" }
            ].map(gw => (
              <div key={gw.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div>
                  <p className="text-xs font-bold text-white">{gw.name}</p>
                  <p className="text-[10px] text-zinc-500">{gw.desc}</p>
                </div>
                <button onClick={() => setGateways({ ...gateways, [gw.id]: !gateways[gw.id as keyof typeof gateways] })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    gateways[gw.id as keyof typeof gateways]
                      ? "bg-green-500/10 text-green-400 border-green-400/30"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                  }`}>
                  {gateways[gw.id as keyof typeof gateways] ? "Ativo" : "Inativo"}
                </button>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

function SettingsSection({ user }: { user: any }) {
  const [companyName, setCompanyName] = useState("Minha Empresa");
  const [pixKey, setPixKey] = useState("financeiro@minhaempresa.com");
  const [saved, setSaved] = useState(false);

  const saveSettings = async () => {
    await apiFetch("/api/pay/settings", {
      method: "POST",
      body: JSON.stringify({ companyName, pixKey })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">Configurações da Conta</h2>
        <p className="text-xs text-zinc-500 mt-1">Gerencie seu perfil, 2FA e preferências de transferência</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard icon={User} title="Perfil Empresarial">
          <div className="space-y-4">
            {user && (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <img src={user.picture || ""} alt="" className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Nome Fantasia da Empresa</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Chave PIX para Saques Automáticos</label>
              <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none" />
            </div>
            {saved && <p className="text-xs text-[#e8b923] font-mono">Configurações salvas com sucesso!</p>}
            <button onClick={saveSettings} className="w-full py-2.5 bg-[#e8b923] text-black font-bold text-xs rounded-xl hover:opacity-90">
              Salvar Alterações
            </button>
          </div>
        </DashboardCard>
        <DashboardCard icon={Shield} title="Segurança & 2FA TOTP">
          <TwoFactorSetup />
        </DashboardCard>
      </div>
    </div>
  );
}

export default function PayDashboard() {
  const [user, setUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    checkAuth().then(u => {
      setUser(u || { name: "Iago Barreto", email: "iago@axionenterprise.cloud", picture: "" });
      setAuthLoaded(true);
    });
  }, []);

  if (!authLoaded) {
    return (
      <div className="min-h-screen bg-[#040407] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#e8b923] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-mono">Carregando AxionPay...</p>
        </div>
      </div>
    );
  }

  const sections: Record<string, React.ReactNode> = {
    overview: <OverviewSection />,
    tenants: <TenantsSection />,
    "api-keys": <ApiKeysSection />,
    transactions: <TransactionsSection />,
    integrations: <IntegrationsSection />,
    settings: <SettingsSection user={user} />,
  };

  return (
    <div className="min-h-screen bg-[#040407] text-[#f5f5fa] relative overflow-x-hidden">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} user={user} />
      <main className="ml-64 min-h-screen relative z-10">
        <header className="sticky top-0 z-20 bg-[#040407]/80 backdrop-blur-xl border-b border-zinc-800">
          <div className="flex items-center justify-end px-8 h-16 gap-4">
            <a href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-zinc-800">
              <Home className="w-3.5 h-3.5" /> Landing
            </a>
            <div className="flex items-center gap-2.5 pl-4 border-l border-zinc-800">
              <img src={user?.picture || ""} alt="" className="w-7 h-7 rounded-full" />
              <span className="text-xs font-bold text-white hidden sm:block">{user?.name}</span>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {sections[activeSection]}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
