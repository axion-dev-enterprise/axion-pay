import React, { useState } from 'react';
import { CreditCard, Lock, ShieldCheck, Calendar, User, Eye, EyeOff } from 'lucide-react';

export interface CardFormData {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  installments: number;
}

interface CardPaymentFormProps {
  amount: number;
  maxInstallments?: number;
  loading?: boolean;
  onSubmit: (data: CardFormData) => Promise<void> | void;
  className?: string;
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  amount,
  maxInstallments = 12,
  loading = false,
  onSubmit,
  className = '',
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

  // Detecta bandeira do cartão
  const detectBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (/^4/.test(clean)) return { brand: 'VISA', color: 'from-blue-600 to-indigo-900' };
    if (/^(5[1-5]|2[2-7])/.test(clean)) return { brand: 'MASTERCARD', color: 'from-orange-600 to-red-900' };
    if (/^3[47]/.test(clean)) return { brand: 'AMEX', color: 'from-cyan-700 to-blue-950' };
    if (/^(4011|4389|5041|5067|6363)/.test(clean)) return { brand: 'ELO', color: 'from-yellow-600 to-neutral-900' };
    if (/^606282/.test(clean)) return { brand: 'HIPERCARD', color: 'from-red-700 to-rose-950' };
    return { brand: 'CARTÃO', color: 'from-zinc-800 to-zinc-950' };
  };

  const cardInfo = detectBrand(cardNumber);

  // Formatador de número
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Formatador de validade MM/AA
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (v.length > 2) v = `${v.substring(0, 2)}/${v.substring(2)}`;
    setExpiry(v);
  };

  // Formatador de CVV
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCvv(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [expMonth, expYear] = expiry.split('/');
    onSubmit({
      cardNumber: cardNumber.replace(/\s/g, ''),
      cardHolder,
      expiryMonth: expMonth || '',
      expiryYear: expYear ? `20${expYear}` : '',
      cvv,
      installments,
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      <!-- Visual Card Preview -->
      <div className="perspective-1000 max-w-sm mx-auto">
        <div
          className={`w-full h-48 rounded-2xl p-5 bg-gradient-to-tr ${cardInfo.color} border border-white/10 shadow-2xl flex flex-col justify-between text-white relative transition-transform duration-500`}
        >
          <div className="flex justify-between items-start">
            <div className="w-10 h-7 rounded bg-amber-300/80 border border-amber-200/50 flex items-center justify-center">
              <div className="w-6 h-4 border border-amber-800/40 rounded-sm opacity-60" />
            </div>
            <span className="font-mono font-bold tracking-widest text-sm bg-black/20 px-2 py-0.5 rounded backdrop-blur-sm">
              {cardInfo.brand}
            </span>
          </div>

          <div className="font-mono text-lg sm:text-xl tracking-widest text-center my-auto drop-shadow">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>

          <div className="flex justify-between items-end text-xs font-mono">
            <div>
              <span className="block text-[9px] text-zinc-300 uppercase">Titular</span>
              <span className="font-semibold uppercase tracking-wider line-clamp-1 max-w-[180px]">
                {cardHolder || 'NOME DO TITULAR'}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] text-zinc-300 uppercase">Validade</span>
              <span className="font-semibold">{expiry || 'MM/AA'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Inputs -->
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <!-- Número do Cartão -->
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Número do Cartão</label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            />
            <CreditCard className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          </div>
        </div>

        <!-- Nome no Cartão -->
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nome Impresso no Cartão</label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Ex: IAGO F BARRETO"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white uppercase placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
            />
            <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          </div>
        </div>

        <!-- Validade & CVV -->
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Validade (MM/AA)</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="MM/AA"
                value={expiry}
                onChange={handleExpiryChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              />
              <Calendar className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Código CVV</label>
            <div className="relative">
              <input
                type={showCvv ? 'text' : 'password'}
                required
                placeholder="123"
                value={cvv}
                onChange={handleCvvChange}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowCvv(!showCvv)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200"
              >
                {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <!-- Parcelamento -->
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Opções de Parcelamento</label>
          <select
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
          >
            {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => {
              const installmentValue = (amount / n).toFixed(2);
              return (
                <option key={n} value={n}>
                  {n}x de R$ {installmentValue.replace('.', ',')} {n === 1 ? '(à vista)' : 'sem juros'}
                </option>
              );
            })}
          </select>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{loading ? 'Processando Pagamento...' : `Pagar R$ ${amount.toFixed(2).replace('.', ',')}`}</span>
        </button>
      </form>
    </div>
  );
};
