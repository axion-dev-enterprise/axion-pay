import { FormEvent, useEffect, useRef, useState } from 'react';
import { CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';

declare global {
  interface Window { Stripe?: (key: string) => any; }
}

const API = 'https://api.axionenterprise.cloud';
const AUTH = 'https://auth.axionenterprise.cloud';

export default function CardCheckout() {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const [status, setStatus] = useState('Preparando checkout seguro…');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const setup = async () => {
      const configRes = await fetch(`${API}/v1/card/config`, { credentials: 'include' });
      if (!configRes.ok) throw new Error('Checkout de cartão indisponível.');
      const config = await configRes.json();
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = async () => {
        try {
          if (!window.Stripe) throw new Error('Stripe.js não foi carregado.');
          const stripe = window.Stripe(config.publishableKey);
          const returnedSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
          if (returnedSecret) {
            const returned = await stripe.retrievePaymentIntent(returnedSecret);
            setReady(false);
            setStatus(returned.paymentIntent?.status === 'succeeded' ? 'Pagamento confirmado com sucesso.' : `Pagamento: ${returned.paymentIntent?.status || 'não confirmado'}.`);
            return;
          }
          const intentRes = await fetch(`${API}/v1/card/payment-intents`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ amountCents: 100 }),
          });
          if (intentRes.status === 401) {
            window.location.assign(`${AUTH}/login?return_to=${encodeURIComponent(window.location.href)}`);
            return;
          }
          const intent = await intentRes.json();
          if (!intentRes.ok) throw new Error(intent.error || 'Não foi possível iniciar o pagamento.');
          if (!active || !mountRef.current) return;
          const elements = stripe.elements({
            clientSecret: intent.clientSecret,
            appearance: { theme: 'night', variables: { colorPrimary: '#00e66b', colorBackground: '#09120d', colorText: '#f4fff7', borderRadius: '10px' } },
          });
          elements.create('payment', { layout: 'tabs' }).mount(mountRef.current);
          stripeRef.current = stripe;
          elementsRef.current = elements;
          setReady(true);
          setStatus('Dados protegidos pela Stripe. A AXION não recebe número ou CVC.');
        } catch (error: any) { setStatus(error.message); }
      };
      document.head.appendChild(script);
    };
    setup().catch((error) => setStatus(error.message));
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
    setSubmitting(true);
    setStatus('Confirmando diretamente com a Stripe…');
    const result = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: `${window.location.origin}/card-checkout?payment=complete` },
      redirect: 'if_required',
    });
    if (result.error) { setStatus(result.error.message || 'Pagamento não confirmado.'); setSubmitting(false); return; }
    if (result.paymentIntent?.status === 'succeeded') { setStatus('Pagamento confirmado com sucesso.'); setReady(false); }
    setSubmitting(false);
  };

  return <main className="pay-workspace min-h-screen bg-[#040806] px-5 py-12 text-white">
    <div className="mx-auto max-w-xl">
      <a href="/" className="text-sm text-[#69f0ae]">AXION Pay</a>
      <section className="mt-8 rounded-3xl border border-[#213428] bg-[#09120d] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs tracking-[.16em] text-[#69f0ae]">CHECKOUT PERSONALIZADO</p><h1 className="mt-3 text-3xl font-semibold">Pagamento por cartão</h1></div><CreditCard className="h-8 w-8 text-[#00e66b]" aria-hidden="true" /></div>
        <div className="my-7 flex items-end justify-between border-y border-[#213428] py-5"><span className="text-sm text-[#a1b0a6]">Validação AXION Pay</span><strong className="font-mono text-3xl">R$ 1,00</strong></div>
        <form onSubmit={submit}><div ref={mountRef} className="min-h-36" /><button type="submit" disabled={!ready || submitting} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e66b] px-5 py-3.5 font-semibold text-[#032111] disabled:cursor-wait disabled:opacity-50"><LockKeyhole className="h-4 w-4" aria-hidden="true" />{submitting ? 'Confirmando…' : 'Pagar R$ 1,00'}</button></form>
        <p className="mt-4 min-h-6 text-center text-xs text-[#a1b0a6]">{status}</p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#6f8978]"><ShieldCheck className="h-4 w-4" aria-hidden="true" />PCI via Stripe Elements · 3DS habilitado</div>
      </section>
    </div>
  </main>;
}
