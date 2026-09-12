import React, { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  QrCode,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  ArrowLeft,
  DollarSign
} from 'lucide-react';

declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

const API_BASE = 'https://api.axionenterprise.cloud';

type PublicLink = {
  id: string;
  title: string;
  description: string | null;
  amountCents: number | null;
  allowCustomAmount: boolean;
  acceptedMethods: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  merchantName: string;
  merchantDocument: string | null;
  createdAt: string;
};

type PixPaymentState = {
  correlationId: string;
  qrCode?: string;
  qrCodeText: string;
  amountCents: number;
};

export default function PaymentLinkCheckout() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<PublicLink | null>(null);

  // Form State
  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'CARD'>('PIX');
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerDoc, setCustomerDoc] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Execution State
  const [submitting, setSubmitting] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixState, setPixState] = useState<PixPaymentState | null>(null);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const cardMountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);

  // 1. Carrega dados públicos do link
  useEffect(() => {
    if (!id) {
      setError('Identificador do link de pagamento inválido.');
      setLoading(false);
      return;
    }

    const fetchLink = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/payment-links/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Link de pagamento não encontrado ou indisponível.');
        }
        const data: PublicLink = await res.json();
        setLink(data);

        // Define método padrão conforme os métodos aceitos
        if (data.acceptedMethods.includes('PIX')) {
          setSelectedMethod('PIX');
        } else if (data.acceptedMethods.includes('CARD')) {
          setSelectedMethod('CARD');
        }

        if (data.allowCustomAmount) {
          setCustomAmountStr('50,00');
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar link.');
      } finally {
        setLoading(false);
      }
    };

    fetchLink();
  }, [id]);

  // 2. Polling de confirmação do PIX
  useEffect(() => {
    if (!pixState?.correlationId || paymentSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/charges/${pixState.correlationId}`).catch(() => null);
        if (res && res.ok) {
          const charge = await res.json();
          if (['COMPLETED', 'CONFIRMED', 'PAID'].includes(charge.status?.toUpperCase())) {
            setPaymentSuccess(true);
            clearInterval(interval);
          }
        }
      } catch {
        // Ignora erros transitórios
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [pixState, paymentSuccess]);

  // Calcula o valor final em centavos
  const getFinalAmountCents = (): number => {
    if (!link) return 0;
    if (!link.allowCustomAmount) return link.amountCents || 0;
    const cleanStr = customAmountStr.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  // 3. Submissão do Pagamento (PIX ou Iniciação do Cartão)
  const handleInitiatePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!link || !id) return;

    const finalAmountCents = getFinalAmountCents();
    if (finalAmountCents < 100) {
      alert('O valor mínimo para pagamento é de R$ 1,00.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('Iniciando transação segura…');

    try {
      const payload = {
        paymentMethod: selectedMethod,
        amountCents: finalAmountCents,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerDocument: customerDoc.replace(/\D/g, '') || undefined,
        customerPhone: customerPhone.replace(/\D/g, '') || undefined,
      };

      const res = await fetch(`${API_BASE}/v1/payment-links/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível gerar a ordem de pagamento.');
      }

      if (selectedMethod === 'PIX') {
        setPixState({
          correlationId: data.correlationId,
          qrCode: data.qrCode,
          qrCodeText: data.qrCodeText,
          amountCents: data.amountCents,
        });
        setStatusMessage('QR Code PIX gerado com sucesso. Aguardando confirmação bancária…');
      } else if (selectedMethod === 'CARD') {
        setCardClientSecret(data.clientSecret);
        mountStripeElements(data.clientSecret);
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Erro ao processar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Montar campos seguros do Stripe para cartão
  const mountStripeElements = async (clientSecret: string) => {
    try {
      setStatusMessage('Carregando AXION Secure Fields…');
      const configRes = await fetch(`${API_BASE}/v1/card/config`).catch(() => null);
      const pubKey = configRes?.ok ? (await configRes.json()).publishableKey : 'pk_live_default';

      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }

      if (!window.Stripe) throw new Error('Falha ao carregar motor de pagamentos criptografados.');
      const stripe = window.Stripe(pubKey);
      stripeRef.current = stripe;

      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#00e66b',
            colorBackground: '#09120d',
            colorText: '#f3f7f4',
            borderRadius: '12px',
          },
        },
      });

      if (cardMountRef.current) {
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        paymentElement.mount(cardMountRef.current);
        elementsRef.current = elements;
        setStatusMessage('Informe os dados do seu cartão com segurança.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Erro ao preparar checkout de cartão.');
    }
  };

  // 5. Confirmação do Cartão
  const handleConfirmCardPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;

    setSubmitting(true);
    setStatusMessage('Autenticando transação com 3D Secure…');

    try {
      const result = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        redirect: 'if_required',
      });

      if (result.error) {
        alert(result.error.message || 'Falha na aprovação do cartão.');
        setStatusMessage('');
      } else if (result.paymentIntent?.status === 'succeeded') {
        setPaymentSuccess(true);
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao confirmar pagamento por cartão.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPixCode = () => {
    if (!pixState?.qrCodeText) return;
    navigator.clipboard.writeText(pixState.qrCodeText);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040806] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#00e66b] animate-spin mb-4" />
        <p className="text-sm text-[#a1b0a6] font-mono">Conectando ao AXION Pay Secure Checkout…</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-[#040806] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#09120d] border border-red-500/30 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Link de Pagamento Indisponível</h1>
          <p className="text-sm text-[#a1b0a6] leading-relaxed">{error || 'O link solicitado não existe ou já foi finalizado.'}</p>
          <a
            href="https://pay.axionenterprise.cloud"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#182b20] hover:bg-[#213428] text-white text-xs font-semibold transition-all mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Portal AXION Pay</span>
          </a>
        </div>
      </div>
    );
  }

  const finalAmount = getFinalAmountCents();

  return (
    <div className="pay-workspace min-h-screen bg-[#040806] text-[#f3f7f4] font-sans antialiased flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00e66b]/10 border border-[#00e66b]/30 flex items-center justify-center overflow-hidden">
            <img src="/axionpay_logo.png" className="h-8 w-8 object-contain p-0.5" alt="AXION Pay" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            AXION <span className="text-[#00e66b]">Pay</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#69f0ae] bg-[#00e66b]/10 border border-[#00e66b]/20 px-2.5 py-1 rounded-full font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Checkout Criptografado</span>
        </div>
      </div>

      {/* Main Card */}
      <main className="w-full max-w-lg rounded-3xl border border-[#213428] bg-[#09120d] p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Merchant & Title Header */}
        <div className="border-b border-[#213428]/80 pb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-[#a1b0a6] mb-1">
            <Building2 className="w-3.5 h-3.5 text-[#00e66b]" />
            <span className="font-semibold text-white">{link.merchantName}</span>
            {link.merchantDocument && (
              <span className="text-[#6f8978]">· CNPJ/CPF {link.merchantDocument}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">{link.title}</h1>
          {link.description && (
            <p className="text-xs text-[#a1b0a6] mt-1.5 leading-relaxed">{link.description}</p>
          )}

          {/* Amount Box */}
          <div className="mt-5 p-4 rounded-2xl bg-[#040806]/60 border border-[#213428] flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-mono text-[#8b9f93]">Valor Total</span>
            {link.allowCustomAmount ? (
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-mono text-[#00e66b]">R$</span>
                <input
                  type="text"
                  value={customAmountStr}
                  onChange={(e) => setCustomAmountStr(e.target.value)}
                  disabled={Boolean(pixState || cardClientSecret || paymentSuccess)}
                  placeholder="0,00"
                  className="w-32 bg-[#101d14] border border-[#30513d] rounded-lg px-3 py-1 text-right text-xl font-mono font-bold text-white focus:outline-none focus:border-[#00e66b]"
                />
              </div>
            ) : (
              <div className="text-2xl font-mono font-bold text-[#00e66b]">
                R$ {((link.amountCents || 0) / 100).toFixed(2).replace('.', ',')}
              </div>
            )}
          </div>
        </div>

        {/* SUCESSO DO PAGAMENTO */}
        {paymentSuccess ? (
          <div className="text-center py-8 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#00e66b]/20 border border-[#00e66b] mx-auto flex items-center justify-center text-[#00e66b]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Pagamento Confirmado!</h2>
            <p className="text-xs text-[#a1b0a6] max-w-sm mx-auto">
              Sua transação de <strong className="text-white font-mono">R$ {(finalAmount / 100).toFixed(2).replace('.', ',')}</strong> foi aprovada e repassada em tempo real para <strong className="text-white">{link.merchantName}</strong>.
            </p>
            <div className="pt-4">
              <a
                href="https://pay.axionenterprise.cloud"
                className="px-6 py-2.5 rounded-xl bg-[#101d14] hover:bg-[#182b20] border border-[#213428] text-xs font-semibold text-[#69f0ae] transition-all"
              >
                Concluir
              </a>
            </div>
          </div>
        ) : pixState ? (
          /* PIX QR CODE & COPIA E COLA */
          <div className="space-y-6 animate-fadeIn text-center">
            <div className="p-4 rounded-2xl bg-[#040806] border border-[#213428] inline-block mx-auto shadow-lg">
              {pixState.qrCode ? (
                <img
                  src={pixState.qrCode.startsWith('data:') ? pixState.qrCode : `data:image/png;base64,${pixState.qrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-[#101d14] text-xs text-[#a1b0a6] p-4 text-center">
                  Use o código Pix Copia e Cola abaixo
                </div>
              )}
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-[11px] font-mono text-[#8b9f93] uppercase">Pix Copia e Cola</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixState.qrCodeText}
                  className="flex-1 bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#b5c6bb] select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyPixCode}
                  className="px-4 py-2.5 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPix ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#69f0ae] font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Aguardando pagamento no app do seu banco…</span>
            </div>
          </div>
        ) : cardClientSecret ? (
          /* FORMULÁRIO DO CARTÃO */
          <form onSubmit={handleConfirmCardPayment} className="space-y-5 animate-fadeIn">
            <div ref={cardMountRef} className="min-h-36" />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <LockKeyhole className="w-4 h-4" />
              <span>{submitting ? 'Processando…' : `Confirmar R$ ${(finalAmount / 100).toFixed(2).replace('.', ',')}`}</span>
            </button>
          </form>
        ) : (
          /* FORMULÁRIO DE SELEÇÃO E DADOS DO COMPRADOR */
          <form onSubmit={handleInitiatePayment} className="space-y-5">
            {/* Método de Pagamento */}
            <div>
              <label className="block text-[11px] font-mono text-[#8b9f93] uppercase tracking-wider mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                {link.acceptedMethods.includes('PIX') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('PIX')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedMethod === 'PIX'
                        ? 'border-[#00e66b] bg-[#00e66b]/10 text-white shadow-md shadow-emerald-500/10'
                        : 'border-[#213428] bg-[#101d14] text-[#a1b0a6] hover:border-[#30513d]'
                    }`}
                  >
                    <QrCode className={`w-5 h-5 ${selectedMethod === 'PIX' ? 'text-[#00e66b]' : ''}`} />
                    <span className="text-xs font-bold">PIX Instantâneo</span>
                  </button>
                )}

                {link.acceptedMethods.includes('CARD') && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CARD')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedMethod === 'CARD'
                        ? 'border-[#00e66b] bg-[#00e66b]/10 text-white shadow-md shadow-emerald-500/10'
                        : 'border-[#213428] bg-[#101d14] text-[#a1b0a6] hover:border-[#30513d]'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 ${selectedMethod === 'CARD' ? 'text-[#00e66b]' : ''}`} />
                    <span className="text-xs font-bold">Cartão de Crédito</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dados do Comprador */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">Seu Nome Completo</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#506657] focus:outline-none focus:border-[#00e66b]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">Seu E-mail</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="joao@email.com"
                    className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#506657] focus:outline-none focus:border-[#00e66b]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#8b9f93] uppercase mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={customerDoc}
                    onChange={(e) => setCustomerDoc(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#506657] focus:outline-none focus:border-[#00e66b]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono text-[#8b9f93] uppercase">WhatsApp / Celular (Opcional)</label>
                  <span className="text-[10px] text-[#00e66b] font-mono">Receba o Pix no WhatsApp</span>
                </div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#101d14] border border-[#213428] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#506657] focus:outline-none focus:border-[#00e66b]"
                />
              </div>
            </div>

            {/* Botão de Ação */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#00e66b] hover:bg-[#69f0ae] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando cobrança…</span>
                </>
              ) : (
                <>
                  <LockKeyhole className="w-4 h-4" />
                  <span>Pagar R$ {(finalAmount / 100).toFixed(2).replace('.', ',')} com {selectedMethod}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Security Badges */}
        <div className="pt-4 border-t border-[#213428]/80 flex flex-wrap items-center justify-between text-[11px] text-[#6f8978] gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00e66b]" />
            <span>Processado por AXION Pay Gateway</span>
          </div>
          <span>PCI-DSS · 3DS 2.0 · 256-bit SSL</span>
        </div>
      </main>
    </div>
  );
}
