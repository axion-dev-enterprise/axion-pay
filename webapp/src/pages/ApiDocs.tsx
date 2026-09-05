import { useMemo, useState } from "react";
import { Check, ChevronRight, Clipboard, Code2, ExternalLink, Play, ShieldCheck } from "lucide-react";

const API_BASE = "https://api.axionenterprise.cloud";

const endpoints = [
  { method: "GET", path: "/health", title: "Health da API", auth: "Público", description: "Confirma que API, PostgreSQL e Redis estão operacionais." },
  { method: "POST", path: "/v1/charges", title: "Criar cobrança PIX", auth: "API key · charges:write", description: "Cria uma cobrança idempotente para um merchant." },
  { method: "GET", path: "/v1/charges/{correlationId}", title: "Consultar cobrança", auth: "API key · charges:read", description: "Consulta uma cobrança pertencente ao merchant autenticado." },
  { method: "POST", path: "/webhooks/woovi", title: "Webhook Woovi", auth: "Assinatura Woovi", description: "Recebe eventos assinados e processa a conciliação." },
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
    if (endpoint.method === "POST") {
      return language === "curl"
        ? `curl -X POST ${API_BASE}${endpoint.path} \\\n+  -H "Authorization: Bearer $AXION_API_KEY" \\\n+  -H "Idempotency-Key: pedido-001" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{"amountCents":1990,"comment":"Pedido 001"}'`
        : `const response = await fetch("${API_BASE}${endpoint.path}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AXION_API_KEY}\`,\n    "Idempotency-Key": "pedido-001",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({ amountCents: 1990, comment: "Pedido 001" })\n});`;
    }
    return language === "curl"
      ? `curl -sS ${API_BASE}${endpoint.path.replace("{correlationId}", "<correlation-id>")} \\\n+  -H "Authorization: Bearer $AXION_API_KEY"`
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
    <main className="min-h-screen bg-[#040407] px-5 py-8 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <a href="/" className="flex items-center gap-3 font-semibold tracking-tight text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8b923] text-base font-black text-black">A</span><span>AXION Pay <span className="text-zinc-500">/ Docs</span></span></a>
          <a href="/dashboard" className="text-sm font-semibold text-amber-300 hover:text-amber-200">Abrir console</a>
        </header>

        <section className="py-16 lg:max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Documentação interativa</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">Integre cobranças PIX em minutos.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">Use uma API idempotente, autenticada por merchant e operada no backend. Chaves privadas nunca devem chegar ao navegador.</p>
          <div className="mt-7 flex flex-wrap gap-3"><a href="https://api.axionenterprise.cloud/openapi.json" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:border-zinc-500"><ExternalLink className="h-4 w-4" /> OpenAPI JSON</a><button type="button" onClick={runProbe} disabled={probe === "loading"} className="inline-flex items-center gap-2 rounded-xl bg-[#e8b923] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60"><Play className="h-4 w-4" /> {probe === "loading" ? "Testando…" : "Testar API"}</button>{probe === "ok" && <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4" /> API operacional</span>}{probe === "error" && <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300">API indisponível</span>}</div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <nav className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3" aria-label="Endpoints"><p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Endpoints</p>{endpoints.map((item, index) => <button key={item.path} type="button" onClick={() => setSelected(index)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${selected === index ? "bg-amber-300/10 text-amber-200" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}><span><span className={`mr-2 font-mono text-[10px] font-bold ${item.method === "POST" ? "text-cyan-300" : "text-emerald-300"}`}>{item.method}</span><span className="text-sm font-semibold">{item.title}</span></span><ChevronRight className="h-4 w-4" /></button>)}</nav>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-8"><div className="flex flex-wrap items-center gap-3"><span className={`rounded-md px-2 py-1 font-mono text-xs font-bold ${endpoint.method === "POST" ? "bg-cyan-400/10 text-cyan-300" : "bg-emerald-400/10 text-emerald-300"}`}>{endpoint.method}</span><code className="font-mono text-sm text-zinc-200">{endpoint.path}</code><span className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-zinc-500"><ShieldCheck className="h-4 w-4" /> {endpoint.auth}</span></div><h2 className="mt-6 text-2xl font-black text-white">{endpoint.title}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{endpoint.description}</p><div className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#08080b]"><div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3"><div className="flex gap-1 rounded-lg bg-zinc-900 p-1"><button type="button" onClick={() => setLanguage("curl")} className={`rounded-md px-3 py-1 text-xs font-bold ${language === "curl" ? "bg-zinc-700 text-white" : "text-zinc-500"}`}>cURL</button><button type="button" onClick={() => setLanguage("node")} className={`rounded-md px-3 py-1 text-xs font-bold ${language === "node" ? "bg-zinc-700 text-white" : "text-zinc-500"}`}>Node.js</button></div><button type="button" onClick={copyCode} className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white" aria-label="Copiar exemplo">{copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}{copied ? "Copiado" : "Copiar"}</button></div><pre className="overflow-x-auto p-5 text-xs leading-6 text-zinc-300"><code>{code}</code></pre></div><div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-zinc-300"><Code2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>Use a chave somente no seu servidor. Para testar sem risco, solicite uma chave pública de sandbox com escopo de leitura; cobranças reais exigem uma chave privada de merchant.</span></div></article>
        </section>
      </div>
    </main>
  );
}

const correlationId = "<correlation-id>";
