import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface StripeCardElementProps {
  publishableKey?: string;
  onReady?: (stripe: any, cardElement: any) => void;
  onChange?: (event: any) => void;
  error?: string | null;
  className?: string;
}

declare global {
  interface Window {
    Stripe?: any;
  }
}

const DEFAULT_PK = 'pk_live_51TwNLnFwayvFg6rOk7r3sIBFj6PgU2TIjAAZIIAUlCs9NWapSJY81vRwR8IhM7QlIZ6s0nns8gwfmT37N5LIqcOV00hi4sAjWk';

export const StripeCardElement: React.FC<StripeCardElementProps> = ({
  publishableKey = DEFAULT_PK,
  onReady,
  onChange,
  error: externalError,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let cardInstance: any = null;

    const init = async () => {
      try {
        if (!window.Stripe) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.async = true;
          document.head.appendChild(script);

          await new Promise((res, rej) => {
            script.onload = res;
            script.onerror = rej;
          });
        }

        if (!mounted || !window.Stripe || !mountRef.current) return;

        const stripe = window.Stripe(publishableKey);
        const elements = stripe.elements({
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#e8b923',
              colorBackground: '#0d0d12',
              colorText: '#f4f4f5',
              colorDanger: '#ef4444',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '12px',
            },
          },
        });

        const card = elements.create('card', {
          hidePostalCode: true,
          style: {
            base: {
              fontSize: '14px',
              color: '#f4f4f5',
              '::placeholder': { color: '#71717a' },
            },
          },
        });

        cardInstance = card;
        card.mount(mountRef.current);

        card.on('change', (event: any) => {
          if (event.error) {
            setInternalError(event.error.message);
          } else {
            setInternalError(null);
          }
          if (onChange) onChange(event);
        });

        setLoading(false);
        if (onReady) onReady(stripe, card);
      } catch (err: any) {
        console.error('Erro ao inicializar Stripe Elements:', err);
        setLoading(false);
        setInternalError('Falha ao inicializar Stripe Elements.');
      }
    };

    init();

    return () => {
      mounted = false;
      if (cardInstance) {
        try {
          cardInstance.unmount();
          cardInstance.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [publishableKey]);

  const displayError = externalError || internalError;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-zinc-300">
          Dados do Cartão (Stripe PCI-DSS)
        </label>
        <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          TLS 256-Bit
        </span>
      </div>

      <div className="relative">
        <div
          ref={mountRef}
          className="w-full min-h-[46px] p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 focus-within:border-[#e8b923] focus-within:ring-1 focus-within:ring-[#e8b923] transition-all"
        />
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/90 rounded-xl p-3 flex items-center gap-2 text-xs text-zinc-500 font-mono pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-[#e8b923] animate-ping" />
            <span>Conectando ambiente seguro Stripe...</span>
          </div>
        )}
      </div>

      {displayError && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};
