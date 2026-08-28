import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, Clock, RefreshCw } from 'lucide-react';

interface PixPaymentDisplayProps {
  amount: number;
  copiaECola: string;
  qrCodeUrl?: string;
  expiresInSeconds?: number;
  onRefresh?: () => void;
  className?: string;
}

export const PixPaymentDisplay: React.FC<PixPaymentDisplayProps> = ({
  amount,
  copiaECola,
  qrCodeUrl,
  expiresInSeconds = 1800,
  onRefresh,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(copiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className={`p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-5 ${className}`}>
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-white text-sm">Pague com PIX</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </div>

      {/* QR Code Image */}
      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl max-w-[220px] mx-auto shadow-xl">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 object-contain" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-zinc-400 font-mono text-xs">
            Gerando QR Code...
          </div>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-xs text-zinc-400">Valor com 10% de desconto:</span>
        <div className="text-2xl font-bold font-mono text-emerald-400">
          R$ {amount.toFixed(2).replace('.', ',')}
        </div>
      </div>

      {/* Copia e Cola Input + Button */}
      <div className="space-y-2 text-left">
        <label className="block text-xs font-medium text-zinc-300">Código PIX Copia e Cola</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={copiaECola}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 select-all outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              copied
                ? 'bg-emerald-500 text-zinc-950'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Live Polling Indicator */}
      <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Aguardando confirmação bancária...</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="hover:text-white transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
