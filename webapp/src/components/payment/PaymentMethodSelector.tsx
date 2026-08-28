import React from 'react';
import { CreditCard, QrCode, FileText, Zap, ShieldCheck } from 'lucide-react';

export type PaymentMethodId = 'card' | 'pix' | 'b2b_invoice' | 'crypto';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodId;
  onSelect: (method: PaymentMethodId) => void;
  availableMethods?: PaymentMethodId[];
  className?: string;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelect,
  availableMethods = ['card', 'pix', 'b2b_invoice', 'crypto'],
  className = '',
}) => {
  const allOptions: PaymentMethodOption[] = [
    {
      id: 'pix',
      title: 'PIX Instantâneo',
      subtitle: 'Aprovação imediata 24/7',
      icon: <QrCode className="w-5 h-5 text-emerald-400" />,
      badge: '10% OFF',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      id: 'card',
      title: 'Cartão de Crédito',
      subtitle: 'Até 12x no cartão',
      icon: <CreditCard className="w-5 h-5 text-blue-400" />,
      badge: '3DS 2.0',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      id: 'b2b_invoice',
      title: 'Fatura B2B / Boleto',
      subtitle: 'Prazo Net 15/30 dias',
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      badge: 'Atacado',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      id: 'crypto',
      title: 'Cripto / Onramp',
      subtitle: 'USDT, BTC & USDC',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      badge: 'Web3',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
  ];

  const filteredOptions = allOptions.filter((opt) => availableMethods.includes(opt.id));

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {filteredOptions.map((opt) => {
        const isSelected = selectedMethod === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 ${
              isSelected
                ? 'bg-zinc-800/90 border-emerald-500/80 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/5'
                : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg border ${
                  isSelected
                    ? 'bg-zinc-900 border-zinc-700'
                    : 'bg-zinc-950 border-zinc-850'
                }`}
              >
                {opt.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{opt.title}</span>
                  {opt.badge && (
                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                        opt.badgeColor || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{opt.subtitle}</p>
              </div>
            </div>

            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-500'
                  : 'border-zinc-700 bg-zinc-900'
              }`}
            >
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
            </div>
          </button>
        );
      })}
    </div>
  );
};
