import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, CreditCard, Globe2, KeyRound, LayoutDashboard, ShieldCheck, Webhook } from "lucide-react";

const PAY_API = "https://api.axionenterprise.cloud";
type HealthState = "loading" | "ready" | "unavailable";

export default function App() {
  const [health, setHealth] = useState<HealthState>("loading");

  useEffect(() => {
    let active = true;
    fetch(`${PAY_API}/health`)
      .then((response) => { if (active) setHealth(response.ok ? "ready" : "unavailable"); })
      .catch(() => { if (active) setHealth("unavailable"); });
    return () => { active = false; };
  }, []);

  const status = health === "ready"
    ? { icon: CheckCircle2, label: "API operacional", tone: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10" }
    : health === "unavailable"
      ? { icon: CircleAlert, label: "API indisponível", tone: "text-red-300 border-red-400/25 bg-red-400/10" }
      : { icon: ShieldCheck, label: "Verificando API", tone: "text-zinc-300 border-zinc-700 bg-zinc-800/60" };
  const StatusIcon = status.icon;

  return (
    <main className="min-h-screen bg-[#040407] px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center">
        <header className="mb-10 flex items-center justify-between border-b border-zinc-800 pb-6">
          <a href="/" className="flex items-center gap-3 font-semibold tracking-tight text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8b923] text-base font-black text-black">A</span>
            <span>AXION Pay</span>
          </a>
          <a href="/dashboard" className="text-sm font-semibold text-amber-300 hover:text-amber-200">Acessar console</a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-2xl shadow-black/30 sm:p-10">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Gateway server-to-server</p>
            <h1 className="max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">Cobranças PIX com autenticação central AXION.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">Crie merchants, gere chaves de API e acompanhe cobranças pelo console. Nenhuma cobrança é criada pelo navegador e não há dados de demonstração nesta aplicação.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e8b923] px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300"><LayoutDashboard className="h-4 w-4" /> Abrir console <ArrowRight className="h-4 w-4" /></a>
              <a href={`${PAY_API}/openapi.json`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"><BookOpen className="h-4 w-4" /> Documentação da API</a>
            </div>
          </div>

          <aside className="rounded-3xl border border-zinc-800 bg-[#09090d] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Estado do serviço</p>
            <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${status.tone}`}><StatusIcon className="h-4 w-4" /> {status.label}</div>
            <dl className="mt-8 space-y-5 text-sm">
              <div><dt className="text-zinc-500">Autenticação</dt><dd className="mt-1 font-semibold text-zinc-200">AXION Auth Central</dd></div>
              <div><dt className="text-zinc-500">Integração</dt><dd className="mt-1 font-semibold text-zinc-200">Chaves de merchant no console</dd></div>
              <div><dt className="text-zinc-500">Cobranças</dt><dd className="mt-1 font-semibold text-zinc-200">API autenticada e idempotente</dd></div>
            </dl>
          </aside>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3" aria-label="Capacidades da AXION Pay">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <KeyRound className="h-5 w-5 text-amber-300" />
            <h2 className="mt-4 text-base font-bold text-white">Acesso por merchant</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Crie operações segregadas, gere chaves uma única vez e revogue credenciais sem interromper outros merchants.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <Webhook className="h-5 w-5 text-amber-300" />
            <h2 className="mt-4 text-base font-bold text-white">API idempotente</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">O backend registra cobranças e eventos no PostgreSQL para que a integração do seu sistema seja auditável e recuperável.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <ShieldCheck className="h-5 w-5 text-amber-300" />
            <h2 className="mt-4 text-base font-bold text-white">SSO AXION</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">O console é protegido pelo Auth Central. Nenhum dado de teste é usado para representar uma operação real.</p>
          </article>
        </section>

        <section className="mt-16 grid gap-6 rounded-3xl border border-zinc-800 bg-[#09090d] p-7 sm:p-10 lg:grid-cols-[1fr_.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Primeira integração</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Do console à cobrança PIX em quatro passos.</h2>
            <ol className="mt-6 grid gap-4 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 font-bold text-black">1</span><span>Entre com sua identidade corporativa AXION.</span></li>
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 font-bold text-black">2</span><span>Cadastre o merchant que receberá as cobranças.</span></li>
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 font-bold text-black">3</span><span>Gere uma chave de API e armazene o segredo somente no seu servidor.</span></li>
              <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-300 font-bold text-black">4</span><span>Crie e acompanhe a cobrança pelo contrato público da API.</span></li>
            </ol>
          </div>
          <aside className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
            <div className="flex items-center gap-2 text-amber-200"><CreditCard className="h-5 w-5" /><span className="text-sm font-bold">Cartões e planos mensais</span></div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">A experiência de cartão será hospedada pela Stripe, com Checkout e webhooks validados no servidor. Ela está em implantação e não aparece como uma cobrança disponível enquanto a configuração de produção não estiver concluída.</p>
            <p className="mt-4 text-xs leading-5 text-zinc-500">Isso evita promessas comerciais, campos de cartão ou planos fictícios antes da ativação real do provedor.</p>
          </aside>
        </section>

        <section className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-zinc-800 pt-8 sm:flex-row sm:items-center">
          <div><h2 className="text-lg font-bold text-white">Pronto para integrar?</h2><p className="mt-1 text-sm text-zinc-400">Use o console para criar sua operação ou consulte o contrato completo da API.</p></div>
          <div className="flex flex-wrap gap-3"><a href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-[#e8b923] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300"><LayoutDashboard className="h-4 w-4" /> Abrir console</a><a href={`${PAY_API}/openapi.json`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-zinc-500"><Globe2 className="h-4 w-4" /> Ver API</a></div>
        </section>
        <p className="mt-8 text-center text-xs text-zinc-600">AXION Enterprise · Operação sem simulações no frontend.</p>
      </div>
    </main>
  );
}
