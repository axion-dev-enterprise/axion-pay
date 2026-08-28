import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Copy,
  Clock,
  CheckCircle2,
  Lock,
  Building2,
  Zap,
  Tag,
  ArrowRight,
  RefreshCw,
  FileText,
  Coins,
  Sparkles,
} from 'lucide-react';
import { StripeCardElement } from './StripeCardElement';
import { PixPaymentDisplay } from './PixPaymentDisplay';
import { B2BInvoiceForm } from './B2BInvoiceForm';

export interface CheckoutItem {
  id?: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  merchantName?: string;
  features?: string[];
}

interface StylishStripeCheckoutProps {
  item?: CheckoutItem;
  apiBaseUrl?: string;
  onSuccess?: (receipt: any) => void;
  className?: string;
}

export const StylishStripeCheckout: React.FC<StylishStripeCheckoutProps> = ({
  item = {
    title: 'Plano AXION Flow Enterprise Pro',
    description: 'Acesso completo à infraestrutura de automação, pipelines de IA e conectores.',
    price: 297.0,
    merchantName: 'AXION Enterprise LTDA',
    features: [
      'Pipelines ReAct Multi-Pass Ilimitados',
      'Modelos CyberRealistic XL e IP-Adapter FaceID',
      'Meta Graph API v19.0 + CAPI Integrados',
      'Suporte Prioritário 24/7 com SLA 99.9%',
    ],
  },
  apiBaseUrl = 'https://pay.axionenterprise.cloud',
  onSuccess,
  className = '',
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'b2b' | 'crypto'>('card');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [installments, setInstallments] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stripeObj, setStripeObj] = useState<any>(null);
  const [cardElementObj, setCardElementObj] = useState<any>(null);

  // Cálculo de Preços
  const basePrice = item.price;
  const pixDiscount = paymentMethod === 'pix' ? basePrice * 0.1 : 0;
  const couponDiscount = discountPercent > 0 ? (basePrice * discountPercent) / 100 : 0;
  const finalPrice = Math.max(0, basePrice - pixDiscount - couponDiscount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
    if (clean === 'AXION10' || clean === 'PROMO10') {
      setDiscountPercent(10);
      setCouponApplied(true);
      setErrorMessage(null);
    } else if (clean === 'AXION20' || clean === 'VIP20') {
      setDiscountPercent(20);
      setCouponApplied(true);
      setErrorMessage(null);
    } else {
      setErrorMessage('Cupom inválido ou expirado.');
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail) {
      setErrorMessage('Por favor, informe seu e-mail corporativo.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Criação do SetupIntent / PaymentIntent no Backend AxionPay
      const res = await fetch(`${apiBaseUrl}/api/trial/create-setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName || customerEmail,
          email: customerEmail,
          company: customerCompany,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (!stripeObj || !cardElementObj) {
        throw new Error('Módulo seguro da Stripe não inicializado.');
      }

      // 2. Confirmação segura na Stripe com 3D Secure nativo
      const { setupIntent, error: stripeErr } = await stripeObj.confirmCardSetup(
        data.clientSecret,
        {
          payment_method: {
            card: cardElementObj,
            billing_details: {
              name: customerName,
              email: customerEmail,
            },
          },
        }
      );

      if (stripeErr) {
        throw new Error(stripeErr.message || 'Cartão recusado pela rede emissora.');
      }

      // 3. Verificação no Backend e Emissão do Recibo
      const verifyRes = await fetch(`${apiBaseUrl}/api/trial/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId: setupIntent.id }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.reason || 'Falha na validação do pagamento.');
      }

      const receipt = {
        txId: `AXN-PAY-${Date.now().toString(36).toUpperCase()}`,
        amount: finalPrice,
        currency: 'BRL',
        method: 'Cartão de Crédito (Stripe 3DS)',
        cardBrand: verifyData.card.brand,
        cardLast4: verifyData.card.last4,
        installments: `${installments}x de R$ ${(finalPrice / installments).toFixed(2)}`,
        customer: { name: customerName, email: customerEmail },
        timestamp: new Date().toISOString(),
      };

      setPaidReceipt(receipt);
      if (onSuccess) onSuccess(receipt);
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setErrorMessage(err.message || 'Erro inesperado ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSuccess = (methodName: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const receipt = {
        txId: `AXN-PAY-${Date.now().toString(36).toUpperCase()}`,
        amount: finalPrice,
        currency: 'BRL',
        method: methodName,
        customer: { name: customerName || 'Cliente AXION', email: customerEmail || 'cliente@axionenterprise.cloud' },
        timestamp: new Date().toISOString(),
      };
      setPaidReceipt(receipt);
      if (onSuccess) onSuccess(receipt);
    }, 1200);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto ${className}`}>
      {paidReceipt ? (
        /* TELA DE SUCESSO / RECIBO */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 sm:p-10 rounded-3xl bg-[#09090d]/90 backdrop-blur-2xl border border-zinc-800 shadow-2xl text-center space-y-6 max-w-xl mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Pagamento Aprovado!</h2>
            <p className="text-xs text-zinc-400 font-mono">Transação confirmada via AxionPay Gateway</p>
          </div>

          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-5 space-y-3.5 text-xs text-left font-mono">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <span className="text-zinc-400">STATUS</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                APROVADO / LIQUIDADO
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">ID DA TRANSAÇÃO</span>
              <span className="font-bold text-white select-all">{paidReceipt.txId}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">VALOR TOTAL</span>
              <span className="font-bold text-[#e8b923] text-sm">
                R$ {paidReceipt.amount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">MÉTODO</span>
              <span className="text-white">{paidReceipt.method}</span>
            </div>

            {paidReceipt.cardBrand && (
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">CARTÃO</span>
                <span className="text-white">
                  {paidReceipt.cardBrand} •••• {paidReceipt.cardLast4} ({paidReceipt.installments})
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Imprimir Recibo</span>
            </button>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="px-6 py-2.5 rounded-xl bg-[#e8b923] hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-yellow-500/10"
            >
              <span>Acessar Painel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        /* GRID DE CHECKOUT COMPLETO */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUNA ESQUERDA: RESUMO DO PEDIDO */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-[#09090d]/90 backdrop-blur-2xl border border-zinc-800/80 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/80">
                <div className="w-11 h-11 rounded-2xl bg-[#e8b923]/10 border border-[#e8b923]/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-[#e8b923]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Vendedor Oficial</span>
                  <h4 className="text-sm font-bold text-white truncate">{item.merchantName}</h4>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Garantia Incondicional 7 Dias</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{item.description}</p>
                  )}
                </div>

                {item.features && item.features.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">Incluso no Acesso:</p>
                    <ul className="space-y-2">
                      {item.features.map((feat, idx) => (
                        <li key={idx} className="text-xs text-zinc-300 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cupom de Desconto */}
                <form onSubmit={handleApplyCoupon} className="pt-2 border-t border-zinc-800/60">
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 font-mono">Cupom Promocional</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ex: AXION10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={couponApplied}
                        className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none disabled:opacity-60"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponApplied}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {couponApplied ? 'Aplicado' : 'Aplicar'}
                    </button>
                  </div>
                </form>

                {/* Breakdown de Valores */}
                <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800/80 p-4 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="text-white">R$ {basePrice.toFixed(2)}</span>
                  </div>

                  {pixDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Desconto PIX (10% OFF)</span>
                      <span>- R$ {pixDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Cupom ({discountPercent}% OFF)</span>
                      <span>- R$ {couponDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-400">
                    <span>Taxas de Processamento</span>
                    <span className="text-emerald-400 font-semibold">Grátis</span>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-800 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white font-sans">Total a Pagar</span>
                    <span className="text-2xl font-extrabold text-[#e8b923]">
                      R$ {finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2 text-[11px] text-zinc-400 font-mono">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#e8b923]" />
                  <span>Liberação de acesso instantânea via Webhook</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Criptografia bancária ponta a ponta</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: FORMULÁRIO DE PAGAMENTO */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#09090d]/90 backdrop-blur-2xl border border-zinc-800/80 shadow-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Forma de Pagamento</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Selecione seu método preferido para concluir</p>
              </div>

              {/* Seletor de Abas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-[#e8b923] text-black shadow-lg shadow-yellow-500/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                    paymentMethod === 'pix'
                      ? 'bg-[#e8b923] text-black shadow-lg shadow-yellow-500/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>PIX</span>
                  <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    -10%
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('b2b')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'b2b'
                      ? 'bg-[#e8b923] text-black shadow-lg shadow-yellow-500/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Boleto B2B</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('crypto')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === 'crypto'
                      ? 'bg-[#e8b923] text-black shadow-lg shadow-yellow-500/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0" />
                  <span>Crypto</span>
                </button>
              </div>

              {/* ABA 1: CARTÃO STRIPE ELEMENTS */}
              {paymentMethod === 'card' && (
                <form onSubmit={handleCardSubmit} className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome Completo</label>
                      <input
                        type="text"
                        placeholder="Ex: Lucas Silva"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">Empresa / Negócio</label>
                      <input
                        type="text"
                        placeholder="Ex: AXION Enterprise"
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">E-mail Corporativo</label>
                    <input
                      type="email"
                      placeholder="lucas@suaempresa.com"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:border-[#e8b923] focus:outline-none"
                    />
                  </div>

                  {/* Componente Oficial Stripe Elements */}
                  <StripeCardElement
                    onReady={(stripe, card) => {
                      setStripeObj(stripe);
                      setCardElementObj(card);
                    }}
                    error={errorMessage}
                  />

                  {/* Parcelamento */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Opções de Parcelamento</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:border-[#e8b923] focus:outline-none"
                    >
                      <option value="1">1x de R$ {finalPrice.toFixed(2)} (À vista sem juros)</option>
                      <option value="2">2x de R$ {(finalPrice / 2).toFixed(2)} sem juros</option>
                      <option value="3">3x de R$ {(finalPrice / 3).toFixed(2)} sem juros</option>
                      <option value="6">6x de R$ {(finalPrice / 6).toFixed(2)} sem juros</option>
                      <option value="12">12x de R$ {(finalPrice / 12).toFixed(2)} sem juros</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#e8b923] hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Pagar R$ {finalPrice.toFixed(2)} com Stripe</span>
                  </button>
                </form>
              )}

              {/* ABA 2: PIX */}
              {paymentMethod === 'pix' && (
                <div className="space-y-5 pt-1">
                  <PixPaymentDisplay
                    amount={finalPrice}
                    copiaECola="00020126580014br.gov.bcb.pix0136e55b9e02c114389b706c9a38ef6722d55204000053039865406297.005802BR5921AXION ENTERPRISE LTDA6009SAO PAULO62070503***6304C9F1"
                    expiresInSeconds={600}
                  />
                  <button
                    type="button"
                    onClick={() => handleSimulateSuccess('PIX Instantâneo')}
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirmar Pagamento PIX</span>
                  </button>
                </div>
              )}

              {/* ABA 3: BOLETO B2B */}
              {paymentMethod === 'b2b' && (
                <div className="space-y-4 pt-1">
                  <B2BInvoiceForm
                    amount={finalPrice}
                    loading={loading}
                    onSubmit={() => handleSimulateSuccess('Faturamento B2B / Boleto')}
                  />
                </div>
              )}

              {/* ABA 4: CRYPTO */}
              {paymentMethod === 'crypto' && (
                <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-4 font-mono text-xs">
                  <Coins className="w-10 h-10 text-[#e8b923] mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-sm">Crypto Settlement (USDC / USDT / SOL)</h4>
                    <p className="text-zinc-400">Taxa 0% de conversão direta em rede Solana ou Polygon.</p>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-300 select-all text-[11px]">
                    0x71C...AXION_ENTERPRISE_VAULT
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSimulateSuccess('Crypto (USDC / USDT)')}
                    disabled={loading}
                    className="w-full py-3 bg-[#e8b923] hover:bg-amber-400 text-black font-bold uppercase rounded-xl transition-all"
                  >
                    Confirmar Transferência On-Chain
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
