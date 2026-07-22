import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  CreditCard, QrCode, Zap, ShieldCheck, Building2, Check, 
  Copy, Clock, CheckCircle2, ChevronDown, Lock, ArrowRight, 
  HelpCircle, RefreshCw, Terminal, User, LogIn, LayoutDashboard, ExternalLink 
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";

const AUTH_API = "https://auth.axionenterprise.cloud";

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

async function googleLogin() {
  try {
    const res = await fetch(`${AUTH_API}/api/auth/google/url?redirect_to=${encodeURIComponent(window.location.origin)}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else window.location.href = `${AUTH_API}/`;
  } catch { window.location.href = `${AUTH_API}/`; }
}

async function googleLogout() {
  sessionStorage.removeItem("axion_token");
  try {
    await fetch(`${AUTH_API}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch {}
  window.location.reload();
}

const GOLD = "#e8b923";

const PLANS = [
  { 
    name: "Starter", 
    price: "R$ 0", 
    period: "/mensal", 
    feat: "Ideal para novos negócios", 
    items: ["Taxa PIX: 0.99%", "Taxa Cartão: 3.99% + R$0.39", "Recebimento PIX: na hora", "Link de pagamento", "Suporte e-mail"], 
    popular: false 
  },
  { 
    name: "Pro", 
    price: "R$ 99", 
    period: "/mensal", 
    feat: "Para negócios em crescimento", 
    items: ["Taxa PIX: 0.89%", "Taxa Cartão: 3.49% + R$0.29", "Recebimento PIX: na hora", "Checkout Transparente", "Webhook de confirmação", "Suporte prioritário 24/7"], 
    popular: true 
  },
  { 
    name: "Enterprise", 
    price: "Sob consulta", 
    period: "", 
    feat: "APIs e marca própria", 
    items: ["API de alta performance", "Checkout White-label", "Gerente de conta dedicado", "SLA de 99.9% garantido", "Taxas customizadas"], 
    popular: false 
  },
];

const CODE_EXAMPLES = {
  curl: `curl -X POST "https://api.axionpay.cloud/v1/charges" \\
  -H "Authorization: Bearer sec_key_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1000,
    "currency": "BRL",
    "payment_method": "pix",
    "description": "Pagamento Pedido #1029"
  }'`,
  node: `const axion = require('axionpay')('sec_key_live_...');

await axion.charges.create({
  amount: 1000,
  currency: 'BRL',
  payment_method: 'pix',
  description: 'Pagamento Pedido #1029'
});`,
  python: `import axionpay

axionpay.api_key = "sec_key_live_..."

charge = axionpay.Charge.create(
  amount=1000,
  currency="BRL",
  payment_method="pix",
  description="Pagamento Pedido #1029"
)`
};

const FAQ = [
  { q: "Qual o prazo de recebimento das vendas?", a: "Para vendas via PIX, o saldo é liberado na sua conta digital AxionPay em menos de 10 segundos. Para vendas em cartão de crédito, o prazo padrão é D+1 (1 dia útil)." },
  { q: "Quais são as taxas reais praticadas?", a: "Nossas taxas começam em 0.99% para PIX no plano Starter. No cartão, a taxa padrão é de 3.99% para crédito à vista. Não cobramos taxas ocultas ou adicionais." },
  { q: "Posso usar a AxionPay com minha própria marca?", a: "Sim! Oferecemos planos Enterprise com suporte a White-label e API dedicada, permitindo que você processe pagamentos mantendo a identidade visual da sua própria marca." },
  { q: "Como funciona a integração técnica?", a: "A integração é extremamente simples através de nossa API RESTful. Oferecemos webhooks seguros com autenticação SHA-256 e SDKs prontos para Node.js, Python, PHP e Go." }
];

export default function App() {
  const navigate = useNavigate();
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth().then(u => { setUser(u); setAuthLoaded(true); });
  }, []);

  // Simulador de taxas
  const [calcAmount, setCalcAmount] = useState<string>("1000");
  const [calcMethod, setCalcMethod] = useState<"pix" | "card_vista" | "card_12x">("pix");
  
  // Modal de Cobrança
  const [openModal, setOpenModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixPaid, setPixPaid] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes

  // FAQ state
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [codeTab, setCodeTab] = useState<"curl" | "node" | "python">("curl");
  
  // Newsletter
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  // Countdown timer for mock PIX
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (openModal && countdown > 0 && !pixPaid) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [openModal, countdown, pixPaid]);

  // Reset modal states when opening/closing
  const handleOpenModal = (val?: string) => {
    if (val) {
      setAmount(val);
    }
    setQrCode(null);
    setLink(null);
    setPixPaid(false);
    setCountdown(300);
    setOpenModal(true);
  };

  async function gerarCobranca(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(amount.replace(",", "."));
    if (!v || v <= 0) {
      setLink("Informe um valor válido.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/pay/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-axion-mode": "black" },
        body: JSON.stringify({ amount: Math.round(v * 100), description: "Cobrança AxionPay" }),
      });
      const d = await r.json();
      setLink(d.paymentUrl || d.qrCode || JSON.stringify(d));
      setQrCode(d.paymentUrl || d.qrCode);
    } catch {
      // Mock para demonstração premium sem backend
      setLink(`em55b9e02c114389b706c9a38ef6722d5511924765169`);
      setQrCode("https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=em55b9e02c114389b706c9a38ef6722d5511924765169");
    } finally {
      setLoading(false);
    }
  }

  // Simulate payment confirmation
  const handleSimulatePayment = () => {
    setPixPaid(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live calculator calculation
  const getCalcResults = () => {
    const rawVal = parseFloat(calcAmount.replace(",", ".")) || 0;
    let rate = 0.0099; // 0.99% PIX
    let fixedFee = 0;
    let days = "Instantâneo (10s)";
    
    if (calcMethod === "card_vista") {
      rate = 0.0399; // 3.99%
      fixedFee = 0.39;
      days = "D+1 (1 dia útil)";
    } else if (calcMethod === "card_12x") {
      rate = 0.1299; // 12.99%
      fixedFee = 0.39;
      days = "D+1 antecipado";
    }
    
    const feeAmount = (rawVal * rate) + fixedFee;
    const netVal = Math.max(0, rawVal - feeAmount);
    
    return {
      ratePercent: (rate * 100).toFixed(2) + "%",
      feeText: `R$ ${feeAmount.toFixed(2)}`,
      netText: `R$ ${netVal.toFixed(2)}`,
      days
    };
  };

  const calcResults = getCalcResults();

  return (
    <div className="min-h-screen bg-[#040407] text-[#f5f5fa] relative selection:bg-[#e8b923] selection:text-black">
      {/* Decorative Blur Backgrounds */}
      <div className="glow-bg-radial" />
      <div className="glow-bg-purple" />
      
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>

      {/* Premium Navbar */}
      <header className="sticky top-0 z-50 glass-nav" role="banner">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2" aria-label="AxionPay Home">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-600/10">
              <CreditCard className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              Axion<span className="text-gradient-gold">Pay</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-400" aria-label="Navegação Principal">
            <a href="#beneficios" className="hover:text-[#e8b923] transition-colors">Benefícios</a>
            <a href="#tarifas" className="hover:text-[#e8b923] transition-colors">Tarifas</a>
            <a href="#integracao" className="hover:text-[#e8b923] transition-colors">Integração</a>
            <a href="#faq" className="hover:text-[#e8b923] transition-colors">Dúvidas</a>
          </nav>
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-700 bg-zinc-900/50 text-white hover:bg-zinc-800 transition-all shadow-md"
                >
                  <img src={user.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c'} alt="" className="w-5 h-5 rounded-full" />
                  <span className="max-w-[100px] truncate">{user.name || user.email}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-[#09090d] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="font-bold text-sm text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                      </div>
                      <button onClick={() => { setUserMenuOpen(false); navigate('/dashboard'); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-[#e8b923] transition-colors">
                        <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                      </button>
                      <button onClick={googleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-400/10 border-t border-zinc-800 transition-colors">
                        <LogIn className="w-3.5 h-3.5 rotate-180" /> Sair
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={googleLogin}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-700 bg-white text-black hover:bg-zinc-200 flex items-center gap-1.5 transition-all shadow-md"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Entrar com Google</span>
              </button>
            )}
            <a 
              href="https://wa.me/5511924765169" target="_blank" rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#e8b923]/30 bg-[#e8b923]/10 text-[#e8b923] hover:bg-[#e8b923]/20 transition-all"
            >
              +55 11 92476-5169
            </a>
          </div>
        </div>
      </header>

      <main id="conteudo">
        
        {/* HERO SECTION */}
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 md:py-24 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/5 text-[#e8b923] text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              Taxas reduzidas para PIX e Cartão
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-gradient-metal">
              A forma inteligente de <span className="text-gradient-gold">receber pagamentos.</span>
            </h1>
            
            <p className="text-zinc-400 text-lg leading-relaxed max-w-xl">
              Simplifique o fluxo de caixa do seu negócio. Gere cobranças PIX instantâneas ou links de cartão de crédito e receba com a menor tarifa do mercado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => handleOpenModal("150")}
                className="px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:opacity-90 active:scale-98 transition-all shadow-xl shadow-yellow-500/10 flex items-center justify-center gap-2"
              >
                Gerar Cobrança de Teste
                <ArrowRight className="w-4 h-4" />
              </button>
              <a 
                href="#integracao"
                className="px-6 py-3.5 rounded-xl text-sm font-bold border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/50 text-white flex items-center justify-center gap-2 transition-all"
              >
                Ver Documentação API
              </a>
            </div>
          </div>
          
          {/* SIMULADOR INTERATIVO */}
          <div className="md:col-span-5">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent pointer-events-none" />
              
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                Simulador de Vendas
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="simulador-valor" className="block text-xs font-semibold text-zinc-400 mb-2">Valor da Venda</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold">R$</span>
                    <input 
                      id="simulador-valor"
                      type="text"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white font-bold text-lg focus:border-[#e8b923] focus:outline-none focus:ring-1 focus:ring-[#e8b923] transition-all"
                      placeholder="0,00"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Método de Recebimento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "pix", label: "PIX" },
                      { id: "card_vista", label: "Crédito Vista" },
                      { id: "card_12x", label: "Crédito 12x" }
                    ].map(btn => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setCalcMethod(btn.id as any)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                          calcMethod === btn.id 
                            ? "bg-[#e8b923]/10 border-[#e8b923] text-[#e8b923]" 
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="border-t border-zinc-800/80 pt-4 space-y-3">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Taxa Aplicada:</span>
                    <span className="font-semibold text-white">{calcResults.ratePercent}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Valor da Taxa:</span>
                    <span className="font-semibold text-white">{calcResults.feeText}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Prazo de Liberação:</span>
                    <span className="font-semibold text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {calcResults.days}
                    </span>
                  </div>
                  <div className="border-t border-zinc-800/80 pt-3 flex justify-between items-center">
                    <span className="text-sm font-bold">Você Recebe:</span>
                    <span className="text-2xl font-extrabold text-gradient-gold">
                      {calcResults.netText}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleOpenModal(calcAmount)}
                  className="w-full mt-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#e8b923] hover:bg-zinc-900/80 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  Criar Esta Cobrança
                  <ArrowRight className="w-4 h-4 text-[#e8b923]" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* BENEFICIOS / FEATURES */}
        <section id="beneficios" className="py-20 border-t border-zinc-900 bg-zinc-950/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Tudo que você precisa para <span className="text-gradient-gold">vender mais.</span></h2>
              <p className="text-zinc-400 text-sm md:text-base">
                Oferecemos uma suite completa de ferramentas financeiras projetadas para negócios de qualquer escala.
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: QrCode, t: "PIX Instantâneo", d: "Geração de QR Codes dinâmicos em tempo real com conciliação bancária imediata." },
                { icon: CreditCard, t: "Checkout Transparente", d: "Aceite cartões de crédito e débito direto na sua página sem redirecionamentos." },
                { icon: Zap, t: "Webhooks e Retorno", d: "Notificação instantânea em tempo real de transações pagas, recusadas ou estornadas." },
                { icon: ShieldCheck, t: "Máxima Segurança", d: "Criptografia de ponta a ponta e tokenização de cartões aderente aos padrões PCI-DSS." },
              ].map((f, i) => (
                <div
                  key={f.t}
                  className="glass-card rounded-2xl p-6 relative overflow-hidden group"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 group-hover:border-[#e8b923]/50 transition-colors">
                    <f.icon className="w-5 h-5 text-[#e8b923]" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{f.t}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING / TARIFAS */}
        <section id="tarifas" className="py-20 max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Tarifas transparentes, <span className="text-gradient-gold">sem surpresas.</span></h2>
            <p className="text-zinc-400 text-sm md:text-base">
              Sem taxas de adesão, sem mensalidade nos planos iniciais. Você só paga quando vender.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={p.popular ? "glass-card-popular rounded-3xl p-8 relative flex flex-col justify-between" : "glass-card rounded-3xl p-8 relative flex flex-col justify-between"}
              >
                {p.popular && (
                  <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                    RECOMENDADO
                  </span>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-300">{p.name}</h3>
                    <p className="text-zinc-400 text-xs mt-1">{p.feat}</p>
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gradient-gold">{p.price}</span>
                    <span className="text-sm text-zinc-400 font-medium">{p.period}</span>
                  </div>
                  
                  <ul className="space-y-3.5 border-t border-zinc-800/80 pt-6">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <div className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#e8b923]" />
                        </div>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-8">
                  <button 
                    onClick={() => handleOpenModal("100")}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                      p.popular 
                        ? "bg-[#e8b923] text-black hover:opacity-90" 
                        : "bg-zinc-900 border border-zinc-800 hover:border-[#e8b923] text-white"
                    }`}
                  >
                    Começar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DEVELOPER PLAYGROUND / INTEGRACAO */}
        <section id="integracao" className="py-20 border-t border-zinc-900 bg-zinc-950/20">
          <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-[#e8b923]" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Criado por desenvolvedores, <span className="text-gradient-gold">para desenvolvedores.</span></h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Nossa API foi desenhada seguindo as melhores práticas REST. Integre a AxionPay ao seu sistema, e-commerce ou chatbot em poucos minutos com nossa documentação intuitiva.
              </p>
              <ul className="space-y-3">
                {[
                  "Ambiente de Sandbox para testes imediatos",
                  "SDKs oficiais nas principais linguagens",
                  "Retornos de Webhooks assinados via SSL"
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-[#e8b923]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="lg:col-span-7">
              <div className="bg-[#08080c] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                    <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                    <span className="text-xs text-zinc-500 font-semibold ml-2">axionpay-api-demo</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {[
                      { id: "curl", label: "cURL" },
                      { id: "node", label: "Node.js" },
                      { id: "python", label: "Python" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCodeTab(tab.id as any)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                          codeTab === tab.id 
                            ? "bg-zinc-800 text-white" 
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-5 font-mono text-xs text-left overflow-x-auto bg-[#050508] max-h-[300px]">
                  <pre className="text-zinc-400">
                    {CODE_EXAMPLES[codeTab]}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 max-w-3xl mx-auto px-6">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Perguntas <span className="text-gradient-gold">Frequentes</span></h2>
            <p className="text-zinc-400 text-sm">
              Tire suas principais dúvidas sobre o funcionamento e taxas da AxionPay.
            </p>
          </div>
          
          <div className="space-y-4 text-left">
            {FAQ.map((item, idx) => (
              <div 
                key={idx}
                className="glass-card rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-sm font-bold text-left hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-[#e8b923] shrink-0" />
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${faqOpen === idx ? "rotate-180" : ""}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {faqOpen === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="p-5 pt-0 text-xs md:text-sm text-zinc-400 border-t border-zinc-900 bg-zinc-950/20 leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-[#020204]" role="contentinfo">
        <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-base font-extrabold tracking-tight">
                Axion<span className="text-gradient-gold">Pay</span>
              </span>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed max-w-sm">
              AxionPay é uma marca e produto registrado da AXION Enterprise. Soluções inteligentes de pagamentos digitais para novos tempos de escala.
            </p>
            <div className="text-xs text-zinc-400 font-mono space-y-1 pt-2">
              <p>Atendimento: <a href="https://wa.me/5511924765169" target="_blank" rel="noopener noreferrer" className="text-[#e8b923] hover:underline">+55 11 92476-5169</a></p>
              <p>E-mails: <a href="mailto:contato@axionenterprise.cloud" className="hover:text-[#e8b923]">contato@axionenterprise.cloud</a> | <a href="mailto:suporte@axionenterprise.cloud" className="hover:text-[#e8b923]">suporte@axionenterprise.cloud</a></p>
            </div>
          </div>
          
          <div className="md:col-span-7 flex flex-col sm:flex-row gap-4 items-center justify-end">
            <div className="w-full sm:max-w-xs">
              <input 
                type="email" 
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Inscreva-se na newsletter" 
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:border-[#e8b923] focus:outline-none"
              />
            </div>
            <button 
              onClick={() => {
                if (newsletterEmail) setEmailSubscribed(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all shrink-0"
            >
              {emailSubscribed ? "Inscrito!" : "Inscrever"}
            </button>
          </div>
        </div>
        
        <div className="border-t border-zinc-900 py-6 text-center text-zinc-600 text-[10px]">
          <Building2 className="inline w-3 h-3 mr-1 align-middle" />
          AXION Enterprise · AxionPay © 2026. Todos os direitos reservados.
        </div>
      </footer>

      {/* RADIX DIALOG MODAL DE COBRANCA DE TESTE */}
      <Dialog.Root open={openModal} onOpenChange={setOpenModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[#09090d] border border-zinc-800 rounded-2xl p-6 shadow-2xl z-50 focus:outline-none">
            
            <Dialog.Title className="text-lg font-bold text-white flex items-center justify-between">
              Testar Checkout AxionPay
              <button 
                onClick={() => setOpenModal(false)}
                className="text-zinc-500 hover:text-white font-normal text-sm"
              >
                fechar
              </button>
            </Dialog.Title>
            
            <Dialog.Description className="text-zinc-400 text-xs mt-1">
              Gere uma cobrança fictícia ou real para testar o fluxo de PIX e Cartão de Crédito.
            </Dialog.Description>
            
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="modal-valor" className="block text-xs font-semibold text-zinc-400 mb-2">Valor da Cobrança (R$)</label>
                <form onSubmit={gerarCobranca} className="flex gap-2">
                  <input
                    id="modal-valor"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white font-bold text-base focus:border-[#e8b923] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl font-bold bg-[#e8b923] text-black disabled:opacity-60 text-xs shrink-0 cursor-pointer"
                  >
                    {loading ? "Processando..." : "Gerar"}
                  </button>
                </form>
              </div>

              {link && (
                <div className="border-t border-zinc-900 pt-4 space-y-4">
                  <Tabs.Root defaultValue="pix">
                    <Tabs.List className="flex border-b border-zinc-800" aria-label="Escolha a forma de pagamento">
                      <Tabs.Trigger value="pix" className="flex-1 pb-2.5 text-xs font-bold text-zinc-400 data-[state=active]:text-[#e8b923] data-[state=active]:border-b-2 data-[state=active]:border-[#e8b923]">
                        PIX
                      </Tabs.Trigger>
                      <Tabs.Trigger value="card" className="flex-1 pb-2.5 text-xs font-bold text-zinc-400 data-[state=active]:text-[#e8b923] data-[state=active]:border-b-2 data-[state=active]:border-[#e8b923]">
                        Cartão de Crédito
                      </Tabs.Trigger>
                    </Tabs.List>
                    
                    {/* PIX TAB */}
                    <Tabs.Content value="pix" className="pt-4 space-y-4 text-center">
                      {pixPaid ? (
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="py-6 flex flex-col items-center justify-center space-y-3"
                        >
                          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          </div>
                          <h4 className="text-sm font-bold text-green-400">Pagamento Confirmado!</h4>
                          <p className="text-zinc-500 text-xs">O webhook de confirmação foi enviado em tempo real para sua API.</p>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-4">
                          {qrCode && (
                            <div className="p-3 bg-white rounded-xl border border-zinc-200 inline-block shadow-lg">
                              <img src={qrCode} alt="PIX QR Code" className="w-[160px] h-[160px]" />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            Expira em: <span className="font-mono text-white font-bold">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                          </div>
                          
                          <div className="w-full flex gap-2">
                            <button
                              onClick={() => copyToClipboard(link)}
                              className="flex-1 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copied ? "Copiado!" : "Copiar Chave Pix"}
                            </button>
                            
                            <button
                              onClick={handleSimulatePayment}
                              className="py-2.5 px-4 rounded-lg bg-green-500 text-black hover:bg-green-400 text-xs font-bold transition-all"
                            >
                              Simular Pago
                            </button>
                          </div>
                        </div>
                      )}
                    </Tabs.Content>
                    
                    {/* CREDIT CARD TAB */}
                    <Tabs.Content value="card" className="pt-4 space-y-4">
                      {pixPaid ? (
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="py-6 flex flex-col items-center justify-center space-y-3 text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          </div>
                          <h4 className="text-sm font-bold text-green-400">Transação Aprovada!</h4>
                          <p className="text-zinc-500 text-xs">A transação de crédito foi aprovada com sucesso. Saldo disponível em D+1.</p>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          {/* Credit Card Mockup */}
                          <div className="w-full h-36 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-900 p-4 relative overflow-hidden border border-zinc-700/50 shadow-lg text-left">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/5 to-transparent pointer-events-none" />
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-zinc-500">MOCK CHECKOUT</span>
                              <CreditCard className="w-6 h-6 text-[#e8b923]/60" />
                            </div>
                            <div className="absolute bottom-4 left-4 right-4">
                              <div className="text-sm font-mono text-zinc-300 tracking-widest">•••• •••• •••• 4029</div>
                              <div className="flex justify-between items-center mt-3">
                                <span className="text-[10px] font-mono text-zinc-500">TITULAR DE TESTE</span>
                                <span className="text-[10px] font-mono text-zinc-500">12/29</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-left">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label htmlFor="card-number" className="block text-[10px] font-semibold text-zinc-500 mb-1">Número do Cartão</label>
                                <input id="card-number" type="text" readOnly value="4000 1234 5678 4029" className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400" />
                              </div>
                              <div>
                                <label htmlFor="card-cvv" className="block text-[10px] font-semibold text-zinc-500 mb-1">CVV</label>
                                <input id="card-cvv" type="text" readOnly value="123" className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400" />
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={handleSimulatePayment}
                            className="w-full py-2.5 rounded-lg bg-[#e8b923] text-black hover:opacity-90 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Confirmar Pagamento de R$ {amount}
                          </button>
                        </div>
                      )}
                    </Tabs.Content>
                  </Tabs.Root>
                </div>
              )}
            </div>
            
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
