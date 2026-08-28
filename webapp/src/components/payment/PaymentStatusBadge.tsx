import React from 'react';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle, ShieldCheck } from 'lucide-react';

export type PaymentStatusType = 'paid' | 'completed' | 'pending' | 'processing' | 'failed' | 'rejected' | 'refunded' | 'expired';

interface PaymentStatusBadgeProps {
  status: PaymentStatusType | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normStatus = (status || '').toLowerCase();

  const configMap: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    paid: {
      label: 'Aprovado / Pago',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    completed: {
      label: 'Concluído',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    pending: {
      label: 'Aguardando Pagamento',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
    },
    processing: {
      label: 'Processando...',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    },
    failed: {
      label: 'Recusado',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    rejected: {
      label: 'Rejeitado',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
    refunded: {
      label: 'Estornado',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      icon: <RefreshCw className="w-3.5 h-3.5" />,
    },
    expired: {
      label: 'Expirado',
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/20',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
  };

  const current = configMap[normStatus] || {
    label: status.toUpperCase(),
    bg: 'bg-zinc-800',
    text: 'text-zinc-300',
    border: 'border-zinc-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono tracking-tight ${current.bg} ${current.text} ${current.border} ${sizeStyles[size]} ${className}`}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
};
