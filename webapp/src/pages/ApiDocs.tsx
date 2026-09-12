import "../workspace-theme.css";
import { useMemo, useState } from "react";
import { ChevronRight, Clipboard, Code2, ExternalLink, KeyRound, Play, ShieldCheck, Terminal } from "lucide-react";

const API_BASE = "https://api.axionenterprise.cloud";
const SANDBOX_KEY = "axp_test_docs_-zGnWiRORm5uwFxXQ7666LmyAGQEC5Zo";

type Endpoint = { method: "GET" | "POST"; path: string; title: string; auth: string; description: string; executable?: "health" | "sandbox" };
const endpoints: Endpoint[] = [
  { method: "GET", path: "/health", title: "Health da API", auth: "Público", description: "Confirma em tempo real que API, PostgreSQL e Redis estão operacionais.", executable: "health" },
  { method: "GET", path: "/v1/sandbox/validate", title: "Validar chave sandbox", auth: "Chave sandbox", description: "Autentica a chave pública e comprova que ela está isolada de pagamentos live.", executable: "sandbox" },
  { method: "POST", path: "/v1/charges", title: "Criar cobrança PIX", auth: "API key · charges:write", description: "Cria uma cobrança idempotente para um merchant de produção com QR Code Base64 e Pix Copia e Cola." },
  { method: "GET", path: "/v1/charges/{correlationId}", title: "Consultar cobrança", auth: "API key · charges:read", description: "Consulta uma cobrança pertencente ao merchant autenticado." },
  { method: "GET", path: "/v1/card/config", title: "Configuração do cartão", auth: "Público", description: "Retorna a configuração pública dos campos seguros AXION Pay (Stripe Elements / Card Tokenizer)." },
  { method: "POST", path: "/v1/card/payment-intents", title: "Criar pagamento por cartão", auth: "API key (charges:write) · Sessão AXION", description: "Cria uma intenção idempotente para cobrança com cartão via API Key de merchant ou sessão web; dados sensíveis permanecem nos campos seguros." },
  { method: "POST", path: "/v1/payment-links", title: "Criar Link de Pagamento", auth: "API key · charges:write", description: "Gera um link de checkout autônomo com suporte a PIX, Cartão e parcelamento configurável." },
  { method: "GET", path: "/v1/payment-links", title: "Listar Links de Pagamento", auth: "API key · charges:read", description: "Lista todos os links de pagamento ativos e históricos do merchant." },
  { method: "POST", path: "/v1/subscriptions", title: "Criar assinatura recorrente", auth: "API key · charges:write", description: "Cria assinatura recorrente para o cliente do merchant com cartão e ciclo configurável (mensal/anual)." },
  { method: "GET", path: "/v1/subscriptions/{id}", title: "Consultar assinatura", auth: "API key · charges:read", description: "Consulta o status e ciclo atual da assinatura recorrente." },
  { method: "POST", path: "/v1/subscriptions/{id}/cancel", title: "Cancelar assinatura", auth: "API key · charges:write", description: "Cancela uma assinatura imediatamente ou ao término do ciclo faturado." },
  { method: "GET", path: "/v1/portal/subscriptions/{token}", title: "Portal do Assinante (Self-Service)", auth: "Token do Assinante", description: "Permite ao cliente final visualizar sua assinatura, faturas e métodos de pagamento sem login." },
  { method: "POST", path: "/v1/merchant/webhooks", title: "Cadastrar webhook", auth: "API key · charges:write", description: "Cadastra endpoint para receber notificações de pagamentos e assinaturas com assinatura HMAC-SHA256." },
  { method: "GET", path: "/v1/merchant/webhooks", title: "Listar webhooks", auth: "API key · charges:read", description: "Lista os endpoints de webhook cadastrados para o merchant." },
  { method: "POST", path: "/v1/merchant/webhooks/{id}/test", title: "Testar disparo de webhook", auth: "API key · charges:write", description: "Envia um evento simulado para testar a entrega e o endpoint de callback do merchant." },
  { method: "GET", path: "/v1/dashboard/billing", title: "Status da assinatura", auth: "Sessão AXION", description: "Consulta plano, status e período de trial do merchant." },
  { method: "POST", path: "/v1/dashboard/billing/checkout", title: "Checkout de assinatura", auth: "Sessão AXION", description: "Abre o checkout seguro para a assinatura mensal." },
  { method: "POST", path: "/v1/flow/billing/checkout", title: "Plano AXION Flow + trial", auth: "Sessão AXION", description: "Inicia uma assinatura AXION Flow com o trial correspondente ao plano." },
];

function snippet(endpoint: Endpoint, language: "curl" | "node") {
  const url = `${API_BASE}${endpoint.path}`;
  if (endpoint.executable === "health") return language === "curl" ? `curl -sS ${url}` : `const response = await fetch("${url}");\nconsole.log(await response.json());`;
  if (endpoint.executable === "sandbox") return language === "curl"
    ? `curl -sS ${url} \\\n  -H "Authorization: Bearer ${SANDBOX_KEY}"`
    : `const response = await fetch("${url}", {\n  headers: { Authorization: "Bearer ${SANDBOX_KEY}" }\n});\nconsole.log(response.status, await response.json());`;
  if (endpoint.path === "/v1/card/config") return language === "curl" ? `curl -sS ${url}` : `const config = await fetch("${url}").then(r => r.json());`;
  if (endpoint.path === "/v1/card/payment-intents") return language === "curl"
    ? `curl -X POST ${url} \\\n  -H "Authorization: Bearer $AXION_API_KEY" \\\n  -H "Idempotency-Key: pedido-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amountCents":1990,"customerEmail":"cliente@email.com","metadata":{"orderId":"001"}}'`
    : `const response = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Idempotency-Key": "pedido-001",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    amountCents: 1990,\n    customerEmail: "cliente@email.com",\n    metadata: { orderId: "001" }\n  })\n});\nconst { paymentIntentId, clientSecret } = await response.json();`;
  if (endpoint.path === "/v1/payment-links" && endpoint.method === "POST") return language === "curl"
    ? `curl -X POST ${url} \\\n  -H "Authorization: Bearer $AXION_API_KEY" \\\n  -H "Idempotency-Key: link-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"Curso Avançado","amountCents":29700,"allowedPaymentMethods":["PIX","CARD"],"maxInstallments":12}'`
    : `const response = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Idempotency-Key": "link-001",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    title: "Curso Avançado",\n    amountCents: 29700,\n    allowedPaymentMethods: ["PIX", "CARD"],\n    maxInstallments: 12\n  })\n});\nconst { link } = await response.json();\nconsole.log("URL Pública:", link.publicUrl);`;
  if (endpoint.path.includes("/portal/subscriptions/")) return language === "curl"
    ? `curl -sS "${url.replace("{token}", "<portal-token>")}"`
    : `const response = await fetch("${url.replace("{token}", "<portal-token>")}");\nconst portal = await response.json();`;
  if (endpoint.path.includes("/webhooks/{id}/test")) return language === "curl"
    ? `curl -X POST "${url.replace("{id}", "<webhook-id>")}" \\\n  -H "Authorization: Bearer $AXION_API_KEY"`
    : `const response = await fetch("${url.replace("{id}", "<webhook-id>")}", {\n  method: "POST",\n  headers: { Authorization: \`Bearer \${process.env.AXION_API_KEY}\` }\n});\nconsole.log(await response.json());`;
  if (endpoint.path === "/v1/merchant/webhooks" && endpoint.method === "POST") return language === "curl"
    ? `curl -X POST ${url} \\\n  -H "Authorization: Bearer $AXION_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://seusite.com/webhooks/axion-pay","events":["charge.completed","charge.failed","subscription.created","subscription.paid","subscription.canceled"]}'`
    : `const response = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    url: "https://seusite.com/webhooks/axion-pay",\n    events: ["charge.completed", "charge.failed", "subscription.created", "subscription.paid", "subscription.canceled"]\n  })\n});\nconst { webhook } = await response.json();\nconsole.log("Secret:", webhook.secret);`;
  if (endpoint.path === "/v1/subscriptions" && endpoint.method === "POST") return language === "curl"
    ? `curl -X POST ${url} \\\n  -H "Authorization: Bearer $AXION_API_KEY" \\\n  -H "Idempotency-Key: sub-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"customerEmail":"cliente@email.com","customerName":"Cliente Exemplo","amountCents":4990,"interval":"month"}'`
    : `const response = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Idempotency-Key": "sub-001",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    customerEmail: "cliente@email.com",\n    customerName: "Cliente Exemplo",\n    amountCents: 4990,\n    interval: "month"\n  })\n});\nconst subscription = await response.json();`;
  if (endpoint.path.includes("billing")) return language === "curl" ? `curl -X ${endpoint.method} ${url} \\\n  -H "Authorization: Bearer $AXION_SESSION_TOKEN"` : `const response = await fetch("${url}", { method: "${endpoint.method}", credentials: "include" });`;
  if (endpoint.method === "POST") return language === "curl"
    ? `curl -X POST ${url.replace("{id}", "<subscription-id>")} \\\n  -H "Authorization: Bearer $AXION_API_KEY" \\\n  -H "Idempotency-Key: idemp-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"immediately":false}'`
    : `const response = await fetch("${url.replace("{id}", "<subscription-id>")}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ immediately: false })\n});`;
  return language === "curl" ? `curl -sS ${url.replace("{correlationId}", "<correlation-id>").replace("{id}", "<id>")} \\\n  -H "Authorization: Bearer $AXION_API_KEY"` : `const response = await fetch("${url.replace("{correlationId}", "<correlation-id>").replace("{id}", "<id>")}", { headers: { Authorization: \`Bearer \${process.env.AXION_API_KEY}\` } });`;
}

export default function ApiDocs() {
  const [selected, setSelected] = useState(0);
  const [language, setLanguage] = useState<"curl" | "node">("curl");
  const [copied, setCopied] = useState<"code" | "key" | "agent" | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ status: number; elapsed: number; trace: string; body: unknown } | null>(null);
  const endpoint = endpoints[selected];
  const code = useMemo(() => snippet(endpoint, language), [endpoint, language]);
  const agentInstructions = `Integre a aplicação à AXION Pay usando ${API_BASE}. Ambiente obrigatório para validação: sandbox. Use Authorization: Bearer ${SANDBOX_KEY}. Primeiro execute GET /health; depois GET /v1/sandbox/validate e confirme environment=sandbox, isolated=true e livePaymentsAllowed=false. Em produção, use Authorization: Bearer <AXION_API_KEY> (escopos charges:write e card:write) para emitir cobranças PIX em POST /v1/charges ou gerar Payment Intents de cartão em POST /v1/card/payment-intents. Sempre envie o cabeçalho Idempotency-Key único em toda mutação POST. Não envie body em requisições GET. Consulte o contrato OpenAPI formal em ${API_BASE}/openapi.json.`;

  async function copy(value: string, kind: "code" | "key" | "agent") {
    await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 1800);
  }
  async function runTest() {
    if (!endpoint.executable) return;
    setRunning(true); setResult(null);
    const trace = `docs_${crypto.randomUUID().replace(/-/g, "")}`;
    const started = performance.now();
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: endpoint.executable === "sandbox" ? { Authorization: `Bearer ${SANDBOX_KEY}`, "X-Trace-Id": trace } : { "X-Trace-Id": trace }
      });
      const body = await response.json().catch(() => ({ error: "Resposta sem JSON" }));
      setResult({ status: response.status, elapsed: Math.round(performance.now() - started), trace: response.headers.get("x-trace-id") || trace, body });
    } catch (error) { setResult({ status: 0, elapsed: Math.round(performance.now() - started), trace, body: { error: error instanceof Error ? error.message : "Falha de rede" } }); }
    finally { setRunning(false); }
  }

  return <main className="pay-workspace min-h-screen bg-[#040806] px-5 py-8 text-[#f3f7f4] sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl">
    <header className="flex items-center justify-between border-b border-[#213428] pb-6"><a href="/" className="flex items-center gap-3 font-semibold"><img src="/axionpay_logo.png" width="36" height="36" className="h-9 w-9 object-contain" alt="AXION Pay" /><span>AXION Pay <span className="text-[#8b9f93]">/ Docs</span></span></a><a href="/dashboard" className="text-sm font-semibold text-emerald-300">Abrir console</a></header>
    <section className="py-14"><p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-300">Documentação executável</p><h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">Integre, execute e valide sem tocar produção.</h1><p className="mt-5 max-w-3xl leading-7 text-[#a1b0a6]">Exemplos prontos, contrato OpenAPI e uma chave pública de escopo mínimo para comprovar autenticação e isolamento do ambiente AXION Pay.</p>
      <div className="mt-7 flex flex-wrap gap-3"><a href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#30513d] px-4 py-2.5 text-sm font-bold"><ExternalLink className="h-4 w-4" /> OpenAPI JSON</a><button onClick={() => copy(agentInstructions, "agent")} className="inline-flex items-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-sm font-bold text-black"><Terminal className="h-4 w-4" />{copied === "agent" ? "Instruções copiadas" : "Copiar instruções para agente/LLM"}</button></div>
    </section>
    <section className="mb-8 grid gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.05] p-5 md:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><KeyRound className="h-4 w-4" /> Chave pública sandbox</div><code className="mt-3 block overflow-x-auto rounded-lg border border-[#213428] bg-[#050c08] p-3 text-xs text-[#b5c6bb]">{SANDBOX_KEY}</code><p className="mt-3 text-xs leading-5 text-[#8b9f93]">Escopos: health:read e sandbox:read. Pagamentos live, criação de cobranças e dados de merchants são bloqueados.</p></div><button onClick={() => copy(SANDBOX_KEY, "key")} className="inline-flex h-10 items-center justify-center gap-2 self-center rounded-xl border border-[#30513d] px-4 text-sm font-bold"><Clipboard className="h-4 w-4" />{copied === "key" ? "Copiada" : "Copiar chave"}</button></section>
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]"><nav className="min-w-0 rounded-2xl border border-[#213428] bg-[#050c08]/70 p-3"><p className="px-3 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#8b9f93]">Endpoints</p>{endpoints.map((item,index)=><button key={item.path} onClick={()=>{setSelected(index);setResult(null)}} className={`flex w-full min-w-0 items-center justify-between rounded-xl px-3 py-3 text-left ${selected===index?"bg-emerald-300/10 text-emerald-200":"text-[#a1b0a6] hover:bg-[#101d14]"}`}><span className="min-w-0 truncate"><span className={`mr-2 font-mono text-[10px] font-bold ${item.method==="POST"?"text-cyan-300":"text-emerald-300"}`}>{item.method}</span><span className="text-sm font-semibold">{item.title}</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>)}</nav>
      <article className="min-w-0 rounded-2xl border border-[#213428] bg-[#050c08]/70 p-6 sm:p-8"><div className="flex min-w-0 flex-wrap items-center gap-3"><span className="rounded-md bg-emerald-400/10 px-2 py-1 font-mono text-xs font-bold text-emerald-300">{endpoint.method}</span><code className="min-w-0 break-all font-mono text-sm">{endpoint.path}</code><span className="ml-auto inline-flex items-center gap-2 text-xs text-[#8b9f93]"><ShieldCheck className="h-4 w-4" />{endpoint.auth}</span></div><h2 className="mt-6 text-2xl font-semibold">{endpoint.title}</h2><p className="mt-2 text-sm leading-6 text-[#a1b0a6]">{endpoint.description}</p>
        <div className="mt-8 overflow-hidden rounded-xl border border-[#213428] bg-[#050c08]"><div className="flex items-center justify-between border-b border-[#213428] px-4 py-3"><div className="flex rounded-lg bg-[#101d14] p-1"><button onClick={()=>setLanguage("curl")} className={`rounded-md px-3 py-1 text-xs font-bold ${language==="curl"?"bg-[#294333] text-white":"text-[#8b9f93]"}`}>cURL</button><button onClick={()=>setLanguage("node")} className={`rounded-md px-3 py-1 text-xs font-bold ${language==="node"?"bg-[#294333] text-white":"text-[#8b9f93]"}`}>Node.js</button></div><button onClick={()=>copy(code,"code")} className="inline-flex items-center gap-2 text-xs font-bold text-[#a1b0a6]"><Clipboard className="h-4 w-4" />{copied==="code"?"Copiado":"Copiar"}</button></div><pre className="overflow-x-auto p-5 text-xs leading-6 text-[#b5c6bb]"><code>{code}</code></pre></div>
        {endpoint.executable && <button onClick={runTest} disabled={running} className="mt-5 inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#00e66b] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60"><Play className="h-4 w-4" />{running?"Executando…":"Executar teste real"}</button>}
        {result && <div className="mt-5 overflow-hidden rounded-xl border border-[#213428] bg-[#020503]"><div className="flex flex-wrap gap-4 border-b border-[#213428] px-4 py-3 font-mono text-xs"><span className={result.status>=200&&result.status<300?"text-emerald-300":"text-red-300"}>HTTP {result.status||"NETWORK"}</span><span className="text-[#8b9f93]">{result.elapsed} ms</span><span className="truncate text-[#8b9f93]">trace {result.trace}</span></div><pre className="max-h-72 overflow-auto p-4 text-xs leading-6 text-[#b5c6bb]"><code>{JSON.stringify(result.body,null,2)}</code></pre></div>}
        {!endpoint.executable && <div className="mt-6 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-4 text-sm leading-6 text-[#c8bd96]"><Code2 className="mt-1 h-4 w-4 shrink-0" /><span>Este endpoint exige credencial privada ou sessão AXION. O executor público não envia mutações para produção.</span></div>}
      </article></section>
    <footer className="mt-10 border-t border-[#213428] py-8 text-xs text-[#738178]">AXION Pay · Sandbox pública com escopo mínimo e isolamento obrigatório.</footer>
  </div></main>;
}
