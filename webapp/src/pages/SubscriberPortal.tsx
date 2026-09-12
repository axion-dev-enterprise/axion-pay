import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Receipt,
  Download,
  Building2,
  LockKeyhole,
  Loader2,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  Check,
  X
} from 'lucide-react';

const API_BASE = 'https://api.axionenterprise.cloud';

type Invoice = {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  paidAt: string | null;
  dueDate: string;
  receiptUrl: string | null;
};

type SubscriptionData = {
  id: string;
  planName: string;
  amountCents: number;
  interval: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'PAST_DUE';
  customerName: string;
  customerEmail: string;
  customerTaxId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  cancellationReason: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  portalToken: string;
  createdAt: string;
  merchant: {
    id: string;
    name: string;
    document: string | null;
  };
  invoices: Invoice[];
};

export default function SubscriberPortal() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubscriptionData | null>(null);

  // Modals & Action states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Não preciso mais do serviço');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [canceling, setCanceling] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardBrand, setCardBrand] = useState('mastercard');
  const [cardNumber, setCardNumber] = useState('');
  const [updatingCard, setUpdatingCard] = useState(false);

  const [reactivating, setReactivating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadSubscription = async () => {
    if (!token) {
      setError('Token de acesso do portal não fornecido.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/v1/portal/subscriptions/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Assinatura não encontrada ou link de acesso expirado.');
        }
        throw new Error(`Erro ao carregar dados do portal (HTTP ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Falha na conexão com a central de assinaturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [token]);

  // Handle Cancel
  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setCanceling(true);
      const fullReason = cancelFeedback ? `${cancelReason} - ${cancelFeedback}` : cancelReason;
      const res = await fetch(`${API_BASE}/v1/portal/subscriptions/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: fullReason })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Falha ao solicitar cancelamento.');
      }
      showToast('Assinatura cancelada com sucesso.', 'success');
      setShowCancelModal(false);
      await loadSubscription();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setCanceling(false);
    }
  };

  // Handle Reactivate
  const handleReactivate = async () => {
    if (!token) return;
    try {
      setReactivating(true);
      const res = await fetch(`${API_BASE}/v1/portal/subscriptions/${token}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Falha ao reativar assinatura.');
      }
      showToast('Assinatura reativada com sucesso! Seu plano está ativo.', 'success');
      await loadSubscription();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setReactivating(false);
    }
  };

  // Handle Update Card
  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 4) {
      showToast('Informe os 4 últimos dígitos do cartão.', 'error');
      return;
    }
    const last4 = cleanNum.slice(-4);
    try {
      setUpdatingCard(true);
      const res = await fetch(`${API_BASE}/v1/portal/subscriptions/${token}/payment-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: cardBrand,
          last4: last4
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Falha ao atualizar método de pagamento.');
      }
      showToast('Cartão de crédito atualizado com sucesso!', 'success');
      setShowCardModal(false);
      setCardNumber('');
      await loadSubscription();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingCard(false);
    }
  };

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#e8b923] animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">Carregando portal do assinante...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121217] border border-red-500/20 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Não foi possível carregar a assinatura</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{error || 'Link inexistente ou desativado.'}</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200 transition"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCanceled = data.status === 'CANCELED';
  const isPastDue = data.status === 'PAST_DUE';
  const isActive = data.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-[#e8b923]/20 selection:text-[#e8b923] pb-16">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${
              toastMessage.type === 'success'
                ? 'bg-[#121217] border-emerald-500/40 text-emerald-400'
                : 'bg-[#121217] border-red-500/40 text-red-400'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-zinc-200">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#0c0c10]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e8b923]/10 border border-[#e8b923]/20 flex items-center justify-center text-[#e8b923]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                {data.merchant.name}
              </h1>
              <span className="text-xs text-zinc-500">Central de Autoatendimento do Assinante</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-white/[0.06]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ambiente Seguro AXION Pay</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-6">
        {/* Banner de Boas-vindas / Status */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121217] via-[#16161f] to-[#121217] border border-white/[0.08] p-6 sm:p-8">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
                  Assinatura Recorrente
                </span>
                {isActive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ativa
                  </span>
                )}
                {isCanceled && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                    <XCircle className="w-3 h-3" />
                    Cancelada
                  </span>
                )}
                {isPastDue && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    Pagamento Pendente
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
                {data.planName}
              </h2>

              <p className="text-sm text-zinc-400">
                Assinante: <strong className="text-zinc-200">{data.customerName}</strong> ({data.customerEmail})
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1">
              <div className="text-2xl sm:text-3xl font-bold text-[#e8b923] font-mono">
                {formatMoney(data.amountCents)}
                <span className="text-xs text-zinc-400 font-sans font-normal ml-1">/ {data.interval === 'YEAR' ? 'ano' : 'mês'}</span>
              </div>
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {isCanceled ? (
                  <>Cancelado em {formatDate(data.canceledAt)}</>
                ) : (
                  <>Próxima renovação: <strong className="text-zinc-300 font-mono">{formatDate(data.currentPeriodEnd)}</strong></>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Informações da Assinatura & Formas de Pagamento (2 colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Detalhes do Plano */}
          <div className="bg-[#121217] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#e8b923]" />
              Ciclo de Cobrança
            </h3>

            <div className="divide-y divide-white/[0.06] text-sm">
              <div className="py-3 flex items-center justify-between">
                <span className="text-zinc-400">Início do Ciclo Atual</span>
                <span className="text-zinc-200 font-mono">{formatDate(data.currentPeriodStart)}</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-zinc-400">Fim do Ciclo Atual</span>
                <span className="text-zinc-200 font-mono">{formatDate(data.currentPeriodEnd)}</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-zinc-400">Frequência</span>
                <span className="text-zinc-200">{data.interval === 'YEAR' ? 'Anual' : 'Mensal'}</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-zinc-400">Data de Contratação</span>
                <span className="text-zinc-200 font-mono">{formatDate(data.createdAt)}</span>
              </div>
              {data.cancellationReason && (
                <div className="py-3 flex flex-col gap-1">
                  <span className="text-zinc-400 text-xs">Motivo de Cancelamento</span>
                  <span className="text-red-400/90 text-xs bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    {data.cancellationReason}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Método de Pagamento & Ações */}
          <div className="bg-[#121217] border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#e8b923]" />
                  Método de Cobrança
                </h3>
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Principal
                </span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-200 border border-white/[0.08]">
                    <CreditCard className="w-5 h-5 text-[#e8b923]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                      {data.paymentMethodBrand || 'Cartão de Crédito'}
                    </p>
                    <p className="text-xs text-zinc-400 font-mono">
                      •••• •••• •••• {data.paymentMethodLast4 || '4242'}
                    </p>
                  </div>
                </div>

                {!isCanceled && (
                  <button
                    onClick={() => setShowCardModal(true)}
                    className="text-xs text-[#e8b923] hover:text-[#fbbf24] font-medium px-3 py-1.5 rounded-lg hover:bg-[#e8b923]/10 transition border border-[#e8b923]/20"
                  >
                    Alterar
                  </button>
                )}
              </div>
            </div>

            {/* Ações de Estado: Cancelar ou Reativar */}
            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-3 justify-between">
              {isCanceled ? (
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-sm transition shadow-lg shadow-emerald-950/20 disabled:opacity-50"
                >
                  {reactivating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Reativar Minha Assinatura
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="text-xs text-zinc-500 hover:text-red-400 transition underline underline-offset-4"
                  >
                    Cancelar assinatura
                  </button>
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <LockKeyhole className="w-3 h-3" /> Criptografia AES-256
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Histórico de Faturas / Recibos */}
        <div className="bg-[#121217] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#e8b923]" />
              Histórico de Faturas & Recibos
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              {data.invoices.length} {data.invoices.length === 1 ? 'fatura' : 'faturas'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-semibold text-zinc-400">
                  <th className="pb-3 pl-2">Fatura</th>
                  <th className="pb-3">Vencimento</th>
                  <th className="pb-3">Data de Pagamento</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-800/20 transition">
                    <td className="py-3 pl-2 font-mono text-xs font-semibold text-zinc-200">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 text-zinc-400 font-mono text-xs">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3 text-zinc-400 font-mono text-xs">
                      {formatDate(inv.paidAt)}
                    </td>
                    <td className="py-3 font-mono font-semibold text-zinc-200 text-xs">
                      {formatMoney(inv.amountCents)}
                    </td>
                    <td className="py-3">
                      {inv.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Pago
                        </span>
                      )}
                      {inv.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                      {inv.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <X className="w-3 h-3" /> Falhou
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2">
                      {inv.status === 'PAID' ? (
                        <a
                          href={inv.receiptUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#e8b923] hover:text-[#fbbf24] transition font-medium"
                          onClick={(e) => {
                            if (!inv.receiptUrl) {
                              e.preventDefault();
                              showToast('Comprovante gerado pela adquirente disponível.', 'success');
                            }
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Cancelar Assinatura */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-zinc-100 text-base">Cancelar Assinatura</h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-300">
              Tem certeza que deseja cancelar o plano <strong className="text-zinc-100">{data.planName}</strong>? Você perderá acesso às renovações automáticas.
            </p>

            <form onSubmit={handleCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Motivo do cancelamento:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#e8b923]"
                >
                  <option value="Preço muito alto">Preço muito alto</option>
                  <option value="Não preciso mais do serviço">Não preciso mais do serviço</option>
                  <option value="Migrei para concorrente">Migrei para um concorrente</option>
                  <option value="Problemas técnicos ou suporte">Problemas técnicos ou suporte</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Detalhes adicionais (opcional):
                </label>
                <textarea
                  value={cancelFeedback}
                  onChange={(e) => setCancelFeedback(e.target.value)}
                  placeholder="Conte-nos o que poderíamos ter feito melhor..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-white/[0.1] rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#e8b923]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={canceling}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-950/20"
                >
                  {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirmar Cancelamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Atualizar Cartão */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-[#e8b923]">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-semibold text-zinc-100 text-base">Atualizar Cartão de Crédito</h3>
              </div>
              <button
                onClick={() => setShowCardModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Bandeira do Cartão:
                </label>
                <select
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#e8b923]"
                >
                  <option value="mastercard">Mastercard</option>
                  <option value="visa">Visa</option>
                  <option value="elo">Elo</option>
                  <option value="amex">American Express</option>
                  <option value="hipercard">Hipercard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Últimos 4 Dígitos do Novo Cartão:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 8899"
                  className="w-full bg-zinc-900 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-[#e8b923]"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingCard}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#e8b923] hover:bg-[#fbbf24] text-zinc-950 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20"
                >
                  {updatingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
