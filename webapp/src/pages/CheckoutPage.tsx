import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, RefreshCw, SearchX, ArrowLeft } from 'lucide-react';
import { StylishStripeCheckout, CheckoutItem } from '../components/payment';

export default function CheckoutPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const [product, setProduct] = useState<CheckoutItem | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [notFound, setNotFound] = useState(false);

  const queryAmount = queryParams.get('amount');
  const queryTitle = queryParams.get('title');
  const queryMerchant = queryParams.get('merchant');

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetch(`/api/checkout/products/${slug}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('not_found');
          throw new Error('server_error');
        }
        return res.json();
      })
      .then((data) => {
        if (data?.ok && data?.product) {
          setProduct({
            id: data.product.id,
            title: data.product.title,
            description: data.product.description,
            price: Number(data.product.price),
            currency: data.product.currency || 'BRL',
            merchantName: data.product.payTag?.name || 'AXION Enterprise LTDA',
            features: data.product.features || [
              'Pipelines ReAct Multi-Pass Ilimitados',
              'Meta Graph API v19.0 + CAPI Integrados',
              'Suporte Prioritário 24/7 com SLA 99.9%',
            ],
          });
        } else {
          throw new Error('invalid_data');
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const defaultItem: CheckoutItem = product || {
    title: queryTitle || (slug ? slug.replace(/-/g, ' ').toUpperCase() : 'Plano AXION Flow Pro'),
    description: 'Acesso completo à suíte de agentes autônomos e automação industrial AXION.',
    price: queryAmount ? Number(queryAmount) : 297.0,
    merchantName: queryMerchant || 'AXION Enterprise LTDA',
    features: [
      'Pipelines ReAct Multi-Pass Ilimitados',
      'Modelos CyberRealistic XL e IP-Adapter FaceID',
      'Meta Graph API v19.0 + CAPI Integrados',
      'Suporte Prioritário 24/7 com SLA 99.9%',
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-[#e8b923] animate-spin mx-auto" />
          <p className="text-sm text-zinc-400 font-mono">Carregando checkout seguro...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <SearchX className="w-16 h-16 text-zinc-700 mx-auto" />
          <h2 className="text-xl font-bold text-white">Checkout não encontrado</h2>
          <p className="text-sm text-zinc-400">
            O produto ou link de pagamento não está disponível ou foi expirado.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#e8b923] text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040407] text-[#f5f5fa] font-sans antialiased flex flex-col justify-between selection:bg-[#e8b923] selection:text-black">
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-[#09090d]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors sm:hidden cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-600/20">
                <CreditCard className="w-5 h-5 text-black" />
              </div>
              <span className="text-base font-extrabold tracking-tight">
                Axion<span className="text-[#e8b923]">Pay</span> <span className="text-xs font-normal text-zinc-500">Stripe Verified</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">PCI SAQ-A Compliant // TLS 256-Bit</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full relative z-10">
        <StylishStripeCheckout
          item={defaultItem}
          apiBaseUrl={window.location.origin}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#020204] py-6 text-center text-zinc-500 text-xs font-mono">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AXION Enterprise. Processamento seguro via Stripe & AxionPay.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-300">Termos de Uso</a>
            <a href="#" className="hover:text-zinc-300">Privacidade</a>
            <a href="#" className="hover:text-zinc-300">Segurança Stripe</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
