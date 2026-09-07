import "../workspace-theme.css";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Clipboard, Code2, ExternalLink, Play, ShieldCheck } from "lucide-react";

const API_BASE = "https://api.axionenterprise.cloud";

const endpoints = [
  { method: "GET", path: "/health", title: "Health da API", auth: "Público", description: "Confirma que API, PostgreSQL e Redis estão operacionais." },
  { method: "POST", path: "/v1/charges", title: "Criar cobrança PIX", auth: "API key · charges:write", description: "Cria uma cobrança idempotente para um merchant." },
  { method: "GET", path: "/v1/charges/{correlationId}", title: "Consultar cobrança", auth: "API key · charges:read", description: "Consulta uma cobrança pertencente ao merchant autenticado." },
  { method: "GET", path: "/v1/card/config", title: "Configuração do cartão", auth: "Público", description: "Retorna somente a chave publicável Stripe da conta AXION para inicializar Stripe.js no checkout próprio." },
  { method: "POST", path: "/v1/card/payment-intents", title: "Criar pagamento por cartão", auth: "Sessão AXION", description: "Cria um PaymentIntent idempotente no backend. O cartão é tokenizado diretamente pela Stripe e nunca atravessa a API AXION." },
  { method: "POST", path: "/webhooks/woovi", title: "Webhook Woovi", auth: "Assinatura Woovi", description: "Recebe eventos assinados e processa a conciliação." },
  { method: "GET", path: "/v1/dashboard/billing", title: "Status da assinatura", auth: "Sessão AXION", description: "Consulta plano, status e período de trial do merchant." },
  { method: "POST", path: "/v1/dashboard/billing/checkout", title: "Checkout de cartão", auth: "Sessão AXION", description: "Abre o Checkout Stripe hospedado para assinatura mensal por cartão." },
  { method: "POST", path: "/v1/dashboard/billing/portal", title: "Portal da assinatura", auth: "Sessão AXION", description: "Abre o Customer Portal Stripe para atualizar cartão, fatura ou cancelar." },
  { method: "POST", path: "/v1/flow/billing/checkout", title: "Plano AXION Flow + trial", auth: "Sessão AXION", description: "Inicia assinatura Stripe com trial de 7, 14 ou 30 dias conforme o plano." },
  { method: "POST", path: "/webhooks/stripe", title: "Webhook Stripe", auth: "Assinatura Stripe", description: "Sincroniza pagamentos, trials e cancelamentos no backend." },
];

export default function ApiDocs() {
  const [selected, setSelected] = useState(0);
  const [language, setLanguage] = useState<"curl" | "node">("curl");
  const [copied, setCopied] = useState(false);
  const [probe, setProbe] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const endpoint = endpoints[selected];
  const code = useMemo(() => {
    if (endpoint.path === "/health") {
      return language === "curl"
        ? `curl -sS ${API_BASE}/health`
        : `const response = await fetch("${API_BASE}/health");\nconsole.log(await response.json());`;
    }
    if (endpoint.path === "/v1/card/config") {
      return language === "curl"
        ? `curl -sS ${API_BASE}${endpoint.path}`
        : `const response = await fetch("${API_BASE}${endpoint.path}", {\n  credentials: "include"\n});\nconst { publishableKey } = await response.json();\nconst stripe = await loadStripe(publishableKey);`;
    }
    if (endpoint.path === "/v1/card/payment-intents") {
      return language === "curl"
        ? `curl -X POST ${API_BASE}${endpoint.path} \\\n  -H "Authorization: Bearer $AXION_SESSION_TOKEN" \\\n  -H "Idempotency-Key: pagamento-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amountCents":1990}'`
        : `const intent = await fetch("${API_BASE}${endpoint.path}", {\n  method: "POST",\n  credentials: "include",\n  headers: {\n    "Content-Type": "application/json",\n    "Idempotency-Key": "pagamento-001"\n  },\n  body: JSON.stringify({ amountCents: 1990 })\n}).then((response) => response.json());\n\n// O Payment Element envia o cartão direto à Stripe.\nawait stripe.confirmPayment({\n  elements,\n  clientSecret: intent.clientSecret,\n  confirmParams: { return_url: `${location.origin}/card-checkout` }\n});`;
    }
    if (endpoint.path === "/v1/dashboard/billing/checkout" || endpoint.path === "/v1/dashboard/billing/portal") {
      return language === "curl"
        ? `curl -X POST ${API_BASE}${endpoint.path} \\\n  -H "Authorization: Bearer $AXION_SESSION_TOKEN"`
        : `const response = await fetch("${API_BASE}${endpoint.path}", {\n  method: "POST",\n  credentials: "include"\n});`;
    }
    if (endpoint.path === "/v1/flow/billing/checkout") {
      return language === "curl"
        ? `curl -X POST ${API_BASE}${endpoint.path} \\\n  -H "Authorization: Bearer $AXION_SESSION_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"plan":"starter"}'`
        : `const response = await fetch("${API_BASE}${endpoint.path}", {\n  method: "POST",\n  credentials: "include",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ plan: "starter" })\n});`;
    }
    if (endpoint.path === "/webhooks/stripe") {
      return "Stripe envia este evento assinado ao backend; não chame pelo navegador.";
    }
    if (endpoint.method === "POST") {
      return language === "curl"
        ? `curl -X POST ${API_BASE}${endpoint.path} \\\n  -H "Authorization: Bearer $AXION_API_KEY" \\\n  -H "Idempotency-Key: pedido-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amountCents":1990,"comment":"Pedido 001"}'`
        : `const response = await fetch("${API_BASE}${endpoint.path}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Idempotency-Key": "pedido-001",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ amountCents: 1990, comment: "Pedido 001" })\n});`;
    }
    return language === "curl"
      ? `curl -sS ${API_BASE}${endpoint.path.replace("{correlationId}", "<correlation-id>")} \\\n  -H "Authorization: Bearer $AXION_API_KEY"`
      : `const response = await fetch("${API_BASE}${endpoint.path.replace("{correlationId}", correlationId)}", {\n  headers: { Authorization: \`Bearer \${process.env.AXION_API_KEY}\` }\n});`;
  }, [endpoint, language]);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function runProbe() {
    setProbe("loading");
    try {
      const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      setProbe(response.ok ? "ok" : "error");
    } catch {
      setProbe("error");
    }
  }

  return (
    <main className="pay-workspace min-h-screen bg-[#040806] px-5 py-8 text-[#f3f7f4] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-[#213428] pb-6">
          <a href="/" className="flex items-center gap-3 font-semibold tracking-tight text-white"><span className="grid h-10 w-10 place-items-center rounded-xl text-base font-semibold"><img src="/axion-logo.png" width="40" height="43" alt="" /></span><span>AXION Pay <span className="text-[#8b9f93]">/ Docs</span></span></a>
          <a href="/dashboard" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">Abrir console</a>
        </header>

        <section className="py-16 lg:max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Documentação interativa</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Integre PIX, cartão e assinaturas.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#a1b0a6]">Use uma API idempotente por merchant. O PIX é processado no backend; no cartão, Stripe.js envia os dados diretamente à Stripe e a chave secreta permanece isolada no AXION Pay.</p>
          <div className="mt-7 flex flex-wrap gap-3"><a href="https://api.axionenterprise.cloud/openapi.json" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] px-4 py-2.5 text-sm font-bold text-[#d4e7da] hover:border-zinc-500"><ExternalLink className="h-4 w-4" /> OpenAPI JSON</a><button type="button" onClick={runProbe} disabled={probe === "loading"} className="inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60"><Play className="h-4 w-4" /> {probe === "loading" ? "Testando…" : "Testar API"}</button>{probe === "ok" && <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4" /> API operacional</span>}{probe === "error" && <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300">API indisponível</span>}</div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <nav className="rounded-2xl border border-[#213428] bg-[#050c08]/70 p-3" aria-label="Endpoints"><p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8b9f93]">Endpoints</p>{endpoints.map((item, index) => <button key={item.path} type="button" onClick={() => setSelected(index)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${selected === index ? "bg-emerald-300/10 text-emerald-200" : "text-[#a1b0a6] hover:bg-[#101d14] hover:text-[#d4e7da]"}`}><span><span className={`mr-2 font-mono text-[10px] font-bold ${item.method === "POST" ? "text-cyan-300" : "text-emerald-300"}`}>{item.method}</span><span className="text-sm font-semibold">{item.title}</span></span><ChevronRight className="h-4 w-4" /></button>)}</nav>
          <article className="rounded-2xl border border-[#213428] bg-[#050c08]/70 p-6 sm:p-8"><div className="flex flex-wrap items-center gap-3"><span className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${endpoint.method === "POST" ? "bg-cyan-400/10 text-cyan-300" : "bg-emerald-400/10 text-emerald-300"}`}>{endpoint.method}</span><code className="font-mono text-sm text-[#d4e7da]">{endpoint.path}</code><span className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-[#8b9f93]"><ShieldCheck className="h-4 w-4" /> {endpoint.auth}</span></div><h2 className="mt-6 text-2xl font-semibold text-white">{endpoint.title}</h2><p className="mt-2 text-sm leading-6 text-[#a1b0a6]">{endpoint.description}</p><div className="mt-8 overflow-hidden rounded-xl border border-[#213428] bg-[#050c08]"><div className="flex items-center justify-between border-b border-[#213428] px-4 py-3"><div className="flex gap-1 rounded-lg bg-[#101d14] p-1"><button type="button" onClick={() => setLanguage("curl")} className={`rounded-md px-3 py-1 text-xs font-bold ${language === "curl" ? "bg-[#294333] text-white" : "text-[#8b9f93]"}`}>cURL</button><button type="button" onClick={() => setLanguage("node")} className={`rounded-md px-3 py-1 text-xs font-bold ${language === "node" ? "bg-[#294333] text-white" : "text-[#8b9f93]"}`}>Node.js</button></div><button type="button" onClick={copyCode} className="inline-flex items-center gap-2 text-xs font-bold text-[#a1b0a6] hover:text-white" aria-label="Copiar exemplo">{copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}{copied ? "Copiado" : "Copiar"}</button></div><pre className="overflow-x-auto p-5 text-xs leading-6 text-[#b5c6bb]"><code>{code}</code></pre></div><div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-[#b5c6bb]"><Code2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><span>A chave publicável Stripe pode ser usada no navegador. Chaves secretas Stripe e chaves privadas de merchant pertencem somente ao servidor. Use idempotência em toda criação de cobrança.</span></div></article>
        </section>
        <section className="mt-8 grid gap-6 rounded-2xl border border-[#213428] bg-[#050c08]/70 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Cartão personalizado</p><h2 className="mt-3 text-2xl font-semibold text-white">Sua interface. Tokenização direta na Stripe.</h2><p className="mt-3 text-sm leading-6 text-[#a1b0a6]">O <a className="text-emerald-300 hover:underline" href="/card-checkout">checkout AXION</a> usa Stripe.js e Payment Element, sem Stripe Checkout hospedado. O navegador envia PAN e CVC diretamente à Stripe; a API AXION cria o PaymentIntent com chave secreta e recebe apenas identificadores seguros. Para integrações avançadas com Tokens API e chave publicável, habilite a coleta correspondente na Stripe e mantenha a conformidade PCI aplicável.</p><ol className="mt-5 space-y-2 text-sm text-[#b5c6bb]"><li><b className="text-white">1.</b> Consulte <code className="text-emerald-300">/v1/card/config</code>.</li><li><b className="text-white">2.</b> Crie o intent em <code className="text-emerald-300">/v1/card/payment-intents</code> com idempotência.</li><li><b className="text-white">3.</b> Confirme no navegador usando Stripe.js; trate webhooks como fonte final de estado.</li></ol><p className="mt-5 text-sm leading-6 text-[#a1b0a6]">Assinaturas do gateway continuam disponíveis em <a className="text-emerald-300 hover:underline" href="/dashboard">Plano & cobrança</a>, com Customer Portal para cartão, faturas e cancelamento.</p></div>
          <div><p className="text-sm font-bold text-[#d4e7da]">Trials do AXION Flow</p><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg border border-[#213428] p-3"><b className="block text-white">Starter</b><span className="text-emerald-300">7 dias</span></div><div className="rounded-lg border border-[#213428] p-3"><b className="block text-white">Professional</b><span className="text-emerald-300">14 dias</span></div><div className="rounded-lg border border-[#213428] p-3"><b className="block text-white">Enterprise</b><span className="text-emerald-300">30 dias</span></div></div></div>
        </section>
      </div>
    </main>
  );
}

const correlationId = "<correlation-id>";
