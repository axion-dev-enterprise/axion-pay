import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard, QrCode, ShieldCheck, Check, Copy, Clock, CheckCircle2,
  Lock, ArrowRight, Building2, Zap, AlertCircle, RefreshCw, SearchX
} from "lucide-react";

interface CheckoutProduct {
  id: string;
  slug: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  theme?: string;
  features?: string[];
  payTag?: { name: string };
}

export default function CheckoutPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const chargeId = queryParams.get("charge_id");

  const [product, setProduct] = useState<CheckoutProduct | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [notFound, setNotFound] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState("1");

  const chargeAmount = String(queryParams.get("amount") || product?.price || "297.00");
  const chargeTitle = queryParams.get("title") || product?.title || (slug ? slug.replace(/-/g, " ").toUpperCase() : "Plano Pro AXION Flow");
  const merchant = queryParams.get("merchant") || product?.payTag?.name || "AXION Enterprise LTDA";

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetch(`/api/checkout/products/${slug}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("not_found");
          throw new Error("server_error");
        }
        return res.json();
      })
      .then((data) => {
        if (data?.ok && data?.product) {
          setProduct(data.product);
        } else {
          throw new Error("invalid_data");
        }
      })
      .catch((err) => {
        if (err.message === "not_found") setNotFound(true);
        else setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (!paid && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [paid, countdown]);

  const pixKey = "00020126580014br.gov.bcb.pix0136e55b9e02c114389b706c9a38ef6722d55204000053039865406297.005802BR5921AXION ENTERPRISE LTDA6009SAO PAULO62070503***6304C9F1";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixKey)}`;

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
    }, 1200);
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };
  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-[#e8b923] animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <SearchX className="w-16 h-16 text-zinc-700 mx-auto" />
          <h2 className="text-xl font-black text-white">Checkout não encontrado</h2>
          <p className="text-sm text-zinc-400">O produto ou serviço solicitado não está disponível. Verifique o link ou entre em contato com o vendedor.</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-[#e8b923] text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans antialiased flex flex-col justify-between selection:bg-[#e8b923] selection:text-black">
      <header className="border-b border-zinc-800 bg-[#09090d]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-600/10">
              <CreditCard className="w-5 h-5 text-black" />
            </div>
            <span className="text-base font-extrabold tracking-tight">
              Axion<span className="text-[#e8b923]">Pay</span> <span className="text-xs font-normal text-zinc-500">Checkout Pro</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="hidden sm:inline">Ambiente 100% Seguro</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 space-y-6">
          <div className="bg-[#09090d] border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-[#e8b923]/10 border border-[#e8b923]/20 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#e8b923]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Vendedor</p>
                <h4 className="text-sm font-bold text-white truncate">{merchant}</h4>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Item / Produto</p>
                <h3 className="text-lg font-bold text-white tracking-tight">{chargeTitle}</h3>
                {product?.description && (
                  <p className="text-xs text-zinc-400 mt-1">{product.description}</p>
                )}
                {product?.features && product.features.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {product.features.map((f: string, i: number) => (
                      <li key={i} className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-green-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Subtotal</span>
                  <span className="text-white font-mono">R$ {chargeAmount}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Taxas de Processamento</span>
                  <span className="text-green-400 font-mono">Grátis</span>
                </div>
                <div className="border-t border-zinc-800 pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-extrabold text-white">Total a Pagar</span>
                  <span className="text-2xl font-extrabold text-[#e8b923] font-mono">R$ {chargeAmount}</span>
                </div>
              </div>
            </div>
            {chargeId && (
              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-4 py-2">
                <p className="text-[10px] text-zinc-500 uppercase font-mono">Cobrança</p>
                <p className="text-xs font-mono text-amber-300 truncate">#{chargeId}</p>
              </div>
            )}
            <div className="space-y-2 pt-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#e8b923]" />
                <span>Liberação imediata pós confirmação</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-green-400" />
                <span>Dados criptografados de ponta a ponta</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7">
          <div className="bg-[#09090d] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            {paid ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">Pagamento Confirmado!</h3>
                  <p className="text-xs text-zinc-400 mt-1">Seu pedido foi processado com sucesso. Código: <span className="font-mono text-amber-300">PAY-{Math.floor(100000 + Math.random() * 900000)}</span></p>
                </div>
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => navigate("/dashboard")} className="px-6 py-3 rounded-xl bg-[#e8b923] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all">
                    Ir para o Dashboard
                  </button>
                  <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 font-bold text-xs hover:text-white transition-all">
                    Nova Cobrança
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-bold text-white">Forma de Pagamento</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Selecione como deseja concluir a compra</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setPaymentMethod("pix")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                      paymentMethod === "pix"
                        ? "bg-[#e8b923] text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>PIX Instantâneo</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                      paymentMethod === "card"
                        ? "bg-[#e8b923] text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cartão de Crédito</span>
                  </button>
                </div>

                {paymentMethod === "pix" && (
                  <div className="space-y-6 pt-2">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xl">
                        <img src={qrCodeUrl} alt="QR Code Pix" className="w-44 h-44" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Clock className="w-4 h-4 text-[#e8b923] animate-pulse" />
                        <span>Expira em: </span>
                        <span className="font-mono text-white font-bold">{Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Chave PIX Copia e Cola</label>
                      <div className="flex gap-2">
                        <input
                          type="text" readOnly value={pixKey}
                          className="flex-1 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 truncate focus:outline-none"
                        />
                        <button onClick={copyPixKey} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border border-zinc-700">
                          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copied ? "Copiado!" : "Copiar"}</span>
                        </button>
                      </div>
                    </div>
                    <button onClick={() => handlePayment()} disabled={paying}
                      className="w-full py-3.5 bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-green-500/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Simular Confirmação PIX</span>
                    </button>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <form onSubmit={handlePayment} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Número do Cartão</label>
                      <div className="relative">
                        <input type="text" placeholder="4000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} maxLength={19} required
                          className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                        <CreditCard className="w-5 h-5 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nome no Cartão</label>
                      <input type="text" placeholder="NOME COMO ESTÁ NO CARTÃO" value={cardHolder} onChange={e => setCardHolder(e.target.value.toUpperCase())} required
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Validade</label>
                        <input type="text" placeholder="MM/AA" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} maxLength={5} required
                          className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">CVV</label>
                        <input type="text" placeholder="123" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} required
                          className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Parcelamento</label>
                      <select value={installments} onChange={e => setInstallments(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-[#e8b923] focus:outline-none"
                      >
                        <option value="1">1x de R$ {Number(chargeAmount).toFixed(2)} (À vista sem juros)</option>
                        <option value="2">2x de R$ {(Number(chargeAmount) / 2).toFixed(2)} sem juros</option>
                        <option value="3">3x de R$ {(Number(chargeAmount) / 3).toFixed(2)} sem juros</option>
                        <option value="6">6x de R$ {(Number(chargeAmount) / 6).toFixed(2)} sem juros</option>
                        <option value="12">12x de R$ {(Number(chargeAmount) / 12).toFixed(2)} sem juros</option>
                      </select>
                    </div>
                    <button type="submit" disabled={paying}
                      className="w-full py-3.5 bg-[#e8b923] hover:opacity-90 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2 cursor-pointer mt-4"
                    >
                      {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      <span>Pagar R$ {chargeAmount}</span>
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 bg-[#020204] py-6 text-center text-zinc-500 text-xs">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AXION Enterprise. Processado via AxionPay Infraestrutura.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-300">Termos de Uso</a>
            <a href="#" className="hover:text-zinc-300">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
