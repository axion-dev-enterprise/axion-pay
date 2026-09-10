# axion-pay Workspace Rules

## Architecture & Deployment Targets
- `axion-pay-core` (API de Pagamento, Webhooks, PIX, Assinaturas, Cartão) roda EXCLUSIVAMENTE na **VPS Nó Compute (`6tb9d`)** via Docker Compose (porta interna `100.73.36.87:3333`). PROIBIDO utilizar Vercel para o core.
- O Frontend (`webapp/`) faz deploy estritamente no projeto canônico Vercel `axion-pay` via `vercel deploy --prebuilt --prod`.
- Roteamento de Borda: Cloudflare (`api.axionenterprise.cloud`) → Traefik Ingress na VPS Edge `jd769` (`100.95.86.83`) → `axion-pay-core` na VPS `6tb9d` (`100.73.36.87:3333`).

## Deploy Pipeline (axion-pay-core)
- **Host VPS**: `104.207.81.120:22022`, Tailscale `100.73.36.87`, user `root`. Credenciais em `D:\WORKSPACE\SECURE\VAULT\tokens\servidores\vps_spaceship_6tb9d.json`.
- **Origem dos fontes na VPS**: `/opt/axion/pay-auth/pay-core/src/`
- **Docker Compose stack**: `/opt/axion/pay-auth/stack/docker-compose.yml`
- **Protocolo de Sincronização**: A VPS NÃO é repositório Git clone; arquivos alterados são sincronizados via SFTP (Paramiko/Tailscale SSH).
- **Comando de build/restart**: No diretório `/opt/axion/pay-auth/stack`:
  `docker compose build pay-core && docker compose up -d pay-core`
- **Aviso sobre build local**: O comando `npm run build` local em `packages/axion-pay-core` falha por ausência de `@types` locais (instalados apenas no container Docker). Não execute build local do core; valide via typecheck no container ou no Docker remoto.

## Auth Patterns & Dual-Principal
- Endpoints de mutação e cobrança (`POST /v1/charges`, `POST /v1/card/payment-intents`) DEVEM suportar **Dual-Principal**:
  1. **Merchant via API Key** (`Authorization: Bearer axp_live_*` ou header `x-api-key`) para integrações Server-to-Server (S2S), exigindo escopos apropriados (`charges:write`, `card:write`).
  2. **Dashboard User via Sessão AXION** (`Authorization: Bearer <cookie_ou_session_token>`) para requisições originadas do portal web.
- Chaves públicas de sandbox (`axp_test_*` com escopo `sandbox:read`) possuem rate limit **isolado por IP de origem** (`rate-limit:sandbox:${clientIp}:${window}`, limite de 30 req/min), prevenindo exaustão cruzada entre desenvolvedores.
- Extração canônica de IP: `getClientIp()` priorizando `cf-connecting-ip` → `x-forwarded-for` → `request.ip`.

## Idempotência Obrigatória & Replay Semantics
- Toda mutação (`POST /v1/charges`, `POST /v1/card/payment-intents`) DEVE validar o header `Idempotency-Key` antes de disparar chamadas externas para provedores (Stripe, Open Finance, etc.).
- **Replay Idêntico**: Mesma chave + mesmo montante/dados retorna o registro pré-existente (HTTP 200/201).
- **Conflito de Payload**: Mesma chave + montante divergente DEVE retornar HTTP 409 Conflict (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).

## Zero Test Pollution
- Sempre que forem disparadas transações ou intenções de teste no ambiente live/homologação, os registros criados DEVEM ser imediatamente expurgados do banco relacional PostgreSQL (`axion_services`) na VPS após a validação empírica.
