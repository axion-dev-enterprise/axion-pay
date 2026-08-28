import React, { useState } from 'react';
import { FileText, Building, Mail } from 'lucide-react';

export interface B2BInvoiceData {
  cnpj: string;
  companyName: string;
  financeEmail: string;
  dueDays: number;
  purchaseOrder?: string;
}

interface B2BInvoiceFormProps {
  amount: number;
  loading?: boolean;
  onSubmit: (data: B2BInvoiceData) => Promise<void> | void;
  className?: string;
}

export const B2BInvoiceForm: React.FC<B2BInvoiceFormProps> = ({
  amount,
  loading = false,
  onSubmit,
  className = '',
}) => {
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [financeEmail, setFinanceEmail] = useState('');
  const [dueDays, setDueDays] = useState(30);
  const [purchaseOrder, setPurchaseOrder] = useState('');

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    setCnpj(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      cnpj: cnpj.replace(/\D/g, ''),
      companyName,
      financeEmail,
      dueDays,
      purchaseOrder,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* CNPJ */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">CNPJ da Empresa</label>
        <div className="relative">
          <input
            type="text"
            required
            placeholder="00.000.000/0001-00"
            value={cnpj}
            onChange={handleCnpjChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
          <Building className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Razão Social */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">Razão Social</label>
        <input
          type="text"
          required
          placeholder="Ex: AXION TECNOLOGIA E SERVICOS LTDA"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
          className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
        />
      </div>

      {/* Email do Financeiro */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">E-mail para Envio da Fatura & NF-e</label>
        <div className="relative">
          <input
            type="email"
            required
            placeholder="financeiro@empresa.com.br"
            value={financeEmail}
            onChange={(e) => setFinanceEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
          <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Prazo de Faturamento & Pedido de Compra */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Prazo de Pagamento</label>
          <select
            value={dueDays}
            onChange={(e) => setDueDays(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          >
            <option value={15}>Net 15 Dias</option>
            <option value={30}>Net 30 Dias (Padrão)</option>
            <option value={45}>Net 45 Dias (Grandes Contas)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">Ordem de Compra (PO)</label>
          <input
            type="text"
            placeholder="Ex: PO-2026-89"
            value={purchaseOrder}
            onChange={(e) => setPurchaseOrder(e.target.value.toUpperCase())}
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white font-mono placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-[0.98]"
      >
        <FileText className="w-4 h-4" />
        <span>{loading ? 'Emitindo Fatura B2B...' : `Emitir Fatura de R$ ${amount.toFixed(2).replace('.', ',')}`}</span>
      </button>
    </form>
  );
};
