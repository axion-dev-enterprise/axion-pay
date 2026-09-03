# AXION Pay Core

O runbook da primeira distribuição e o procedimento de ativação da Woovi estão
em [OPERATIONS.md](OPERATIONS.md).

## Estado da distribuição inicial

Esta distribuição entrega um gateway **PIX/Woovi server-to-server**. Cartão,
assinaturas, split, saldo/carteira e Open Finance não devem ser anunciados como
disponíveis até possuírem integrações, contratos e testes próprios.

Antes de expor a API:

1. Copie `.env.example` para `.env`.
2. Troque `POSTGRES_PASSWORD` e use `NODE_ENV=production` apenas com
   `WOOVI_APP_ID` e `AXION_API_KEYS` configurados em um secret manager.
3. Crie uma chave com ao menos 24 caracteres no formato
   `segredo:merchantId:charges:read,charges:write`.
4. Suba `docker compose up --build` e confirme `GET /health`.

Exemplo de chamada autenticada:

```bash
curl -X POST http://localhost:3333/v1/charges \
  -H 'Authorization: Bearer SUA_CHAVE_SECRETA' \
  -H 'Idempotency-Key: pedido-0001' \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":1990,"comment":"Pedido #0001"}'
```

`merchantId` nunca vem do cliente: ele é vinculado à API key. Webhooks Woovi
são validados com assinatura, deduplicados e atualizam a intenção de pagamento
e a transação financeira. As rotas de reconciliação bancária ficam desligadas
por padrão (`ENABLE_BANK_RECONCILIATION=false`).

Comandos de verificação:

```bash
pnpm run typecheck
pnpm run test
docker compose config --quiet
```

> A primeira instalação do pnpm pode pedir aprovação do build do `esbuild` para
> os comandos que usam `tsx`. A imagem de produção compila com `tsc` e executa
> JavaScript compilado.

Starter técnico para unificar três caminhos:

1. **Woovi/OpenPix** como trilho principal para cobranças Pix e webhooks.
2. **Open Finance** como adapter oficial para dados/iniciação por uma instituição participante ou parceiro autorizado.
3. **Nubank Web PJ** apenas como adapter de sessão autenticada e conciliação, sem capturar senha, MFA ou reaproveitar token fora do navegador.

> Este projeto é um core de integração, não um ledger contábil completo nem um produto regulatório pronto para produção.

---

## Arquitetura

```text
Merchant / AXION UI
        |
        v
  AXION Pay API
        |
        +--------------------+
        | PaymentOrchestrator|
        +--------------------+
          |       |       |
          v       v       v
       Woovi   OpenFin   Nubank Web
       OpenPix  Adapter   Reconcile
          |
          v
         PIX

PostgreSQL = fonte de verdade
Redis      = locks, idempotência temporária e filas/cache
```

### Regra central

O Nubank Web **não** é o core transacional.

Use-o como:

- conferência de saldo;
- leitura de extrato;
- reconciliação;
- diagnóstico operacional.

Cobrança, webhook e ações financeiras devem preferir APIs oficiais.

---

# 1. Subir o projeto

Requisitos:

- Node.js 22+
- Docker
- npm

```bash
cp .env.example .env
docker compose up -d
pnpm install
npx playwright install chromium
npm run dev
```

Teste:

```bash
curl http://localhost:3333/health
```

---

# 2. Woovi / OpenPix

## Criar chave

No painel da Woovi/OpenPix:

1. Entre com um usuário ADMIN.
2. Acesse a área de `API/Plugins` ou permissões de API.
3. Crie uma integração do tipo `API`.
4. Faça a validação de dois fatores solicitada pela plataforma.
5. Copie o AppID.
6. Não use prefixo `Bearer`.

Configure:

```env
WOOVI_API_BASE=https://api.woovi.com
WOOVI_APP_ID=SEU_APP_ID
WOOVI_WEBHOOK_PUBLIC_KEYS_URL=https://api.woovi.com/api/v1/webhook/public-keys
```

Para OpenPix:

```env
WOOVI_API_BASE=https://api.openpix.com.br
WOOVI_APP_ID=SEU_APP_ID
WOOVI_WEBHOOK_PUBLIC_KEYS_URL=https://api.openpix.com.br/api/v1/webhook/public-keys
```

Sandbox:

```env
WOOVI_API_BASE=https://api.woovi-sandbox.com
WOOVI_WEBHOOK_PUBLIC_KEYS_URL=https://api.woovi-sandbox.com/api/v1/webhook/public-keys
```

## Criar cobrança

```bash
curl -X POST http://localhost:3333/v1/charges \
  -H 'Authorization: Bearer SUA_CHAVE_SECRETA' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: checkout-0001' \
  -d '{
    "amountCents": 1990,
    "comment": "Teste AXION Pay"
  }'
```

O provider faz:

```http
POST /api/v1/charge
Authorization: <APP_ID>
```

com:

```json
{
  "correlationID": "uuid",
  "value": 1990,
  "comment": "Teste AXION Pay"
}
```

## Webhook

Configure no painel:

```text
https://SEU_DOMINIO/webhooks/woovi
```

O core valida o header:

```text
x-webhook-signature
```

contra as chaves públicas de:

```text
GET /api/v1/webhook/public-keys
```

A validação é feita sobre o **raw body** antes de confiar no JSON.

---

## Assinatura mensal do portal (Stripe)

O portal cria sessões hospedadas do **Stripe Checkout**; dados de cartão nunca passam pelo AXION Pay. A integração só é habilitada depois de configurar credenciais válidas no Vault e injetá-las no ambiente da Core:

```env
STRIPE_BILLING_ENABLED=true
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAY_APP_BASE_URL=https://pay.axionenterprise.cloud
```

No Stripe, configure o endpoint `https://api.axionenterprise.cloud/webhooks/stripe` para os eventos `checkout.session.completed` e `customer.subscription.*`. A Core valida `stripe-signature` sobre o corpo bruto, deduplica por ID de evento e persiste somente identificadores e estado de assinatura — nunca payloads de cartão ou dados sensíveis do webhook.

Endpoints autenticados do dashboard:

- `POST /v1/dashboard/billing/checkout` cria Checkout mensal.
- `POST /v1/dashboard/billing/portal` abre o Customer Portal.
- `GET /v1/dashboard/billing` retorna o estado persistido da assinatura.

---

# 3. Conectar o Nubank PJ

## Objetivo

Este adapter não tenta transformar o frontend privado do Nubank numa API.

Ele mantém um perfil Chromium isolado e deixa o próprio titular fazer login e MFA na interface oficial.

### Ativar

```env
NUBANK_WEB_ENABLED=true
NUBANK_WEB_URL=https://app.nubank.com.br/beta/pj/home
NUBANK_PROFILE_DIR=.nubank-profile
NUBANK_HEADLESS=false
```

### Primeiro login

```bash
npm run nubank:login
```

O Chromium será aberto.

1. Faça login diretamente no site do Nubank.
2. Conclua QR Code, senha, MFA ou validação exigida pelo banco.
3. Quando a home PJ abrir, volte ao terminal.
4. Pressione ENTER.

A sessão do navegador fica no diretório:

```text
.nubank-profile/
```

Nunca:

- envie essa pasta para Git;
- copie cookies/tokens para `.env`;
- desative MFA;
- tente contornar desafios antifraude;
- use a automação para esconder a origem de transferências.

### Testar leitura

```bash
npm run nubank:snapshot
```

Ou:

```bash
curl -X POST http://localhost:3333/internal/reconcile/nubank
```

O adapter tenta localizar o texto `Saldo disponível` e persiste um snapshot no PostgreSQL.

## Importante

O DOM do Nubank pode mudar.

Por isso:

```text
NubankWebProvider
```

deve continuar isolado do restante do core.

Se o frontend mudar, você altera apenas esse adapter.

---

# 4. Open Finance oficial

## O ponto mais importante

Seu CNPJ, por possuir uma conta Nubank PJ, **não ganha automaticamente credenciais de API Open Finance**.

Existem dois cenários:

### A. AXION usa um parceiro/participante autorizado

Este é o caminho indicado para MVP.

Fluxo:

```text
AXION
  |
  v
Parceiro Open Finance / Receptor / ITP
  |
  v
Consentimento
  |
  v
Nubank
  |
  v
Titular autentica e aprova
```

O compartilhamento do Nubank para outra instituição é iniciado no app/fluxo da instituição receptora.

Depois da autorização do titular, seu backend recebe ou consulta os recursos liberados pelo parceiro.

Configure os endpoints conforme a documentação desse parceiro:

```env
OPEN_FINANCE_ENABLED=true
OPEN_FINANCE_API_BASE=https://...
OPEN_FINANCE_TOKEN_URL=https://...
OPEN_FINANCE_CLIENT_ID=...
OPEN_FINANCE_CLIENT_SECRET=...
OPEN_FINANCE_MTLS_CERT_PATH=./certs/client.pem
OPEN_FINANCE_MTLS_KEY_PATH=./certs/client.key

OPEN_FINANCE_ACCOUNTS_PATH=/...
OPEN_FINANCE_TRANSACTIONS_PATH_TEMPLATE=/.../{accountId}/...
```

### B. Participação direta no ecossistema Open Finance

É outro nível de projeto.

O participante precisa estar no ecossistema regulado e no Diretório de Participantes.

A autenticação técnica usa, conforme o papel e a API:

- OAuth 2.0;
- client credentials para determinados serviços;
- mTLS;
- certificados aceitos pelo ecossistema;
- Client ID associado ao software registrado;
- fluxos FAPI/OIDC e consentimento quando aplicável.

Não tente substituir isso por `client_id` improvisado do Nubank.

---

# 5. Como conectar especificamente a conta Nubank PJ via Open Finance

A jornada correta é:

```text
1. Escolha uma instituição receptora/ITP ou agregador Open Finance.
2. Crie a aplicação no parceiro.
3. Gere as credenciais do backend.
4. Crie um consentimento para a empresa/titular.
5. O parceiro gera a URL/jornada de autorização.
6. Abra essa jornada para o titular.
7. Escolha Nubank como instituição detentora.
8. O Nubank autentica o titular.
9. O titular aprova os dados/permissões.
10. O parceiro recebe o consentimento válido.
11. AXION consulta contas/transações via API do parceiro.
```

Do lado do Nubank, o titular pode conferir e revogar consentimentos nas configurações de Open Finance.

---

# 6. OpenFinanceProvider

O arquivo:

```text
src/providers/openfinance.provider.ts
```

implementa a parte de infraestrutura reutilizável:

```text
mTLS
+
OAuth client_credentials
+
cache de access_token
+
request autenticado
```

Os paths ficam configuráveis porque cada parceiro pode expor um gateway diferente, mesmo quando por baixo utiliza as APIs padronizadas do Open Finance.

---

# 7. Modelo de segurança recomendado

```text
Internet
   |
   v
Cloudflare / Reverse Proxy
   |
   v
AXION API
   |
   +--> Webhook ingress
   |
   +--> Payment Orchestrator
   |
   +--> Reconciliation workers
   |
   +--> PostgreSQL
   |
   +--> Redis
```

Secrets:

```text
Vault / Doppler / Docker Secrets / secret manager
```

Evite:

```text
.env dentro do Git
AppID no frontend
cookies bancários no Redis
perfil Chromium em volume público
```

---

# 8. Idempotência

O core aplica:

```sql
UNIQUE (merchant_id, idempotency_key)
UNIQUE (correlation_id)
UNIQUE (provider, provider_charge_id)
UNIQUE (end_to_end_id)
```

Uma intenção é persistida com `correlation_id` antes da chamada à Woovi. Isso
permite retomar uma tentativa com a mesma correlação se houver timeout entre o
provedor e o banco. Redis é usado para limitar requisições por chave de API.

A fonte de verdade continua sendo PostgreSQL.

---

# 9. O que falta para produção

Para escalar além da distribuição inicial PIX:

- fila/outbox real para webhooks e tentativas de recuperação;
- ledger de dupla entrada;
- payouts;
- reservas de saldo;
- auditoria imutável;
- observabilidade;
- alertas;
- rotação de secrets;
- LGPD;
- política antifraude;
- testes de recuperação;
- revisão jurídica/regulatória do modelo de negócio.

---

# 10. Ordem recomendada

## Sprint 1

```text
Woovi/OpenPix sandbox
PostgreSQL
Redis
charges
webhooks
idempotência
```

## Sprint 2

```text
ledger
refund
reconciliation
Nubank Web read-only
```

## Sprint 3

```text
parceiro Open Finance
consentimentos
contas
transações
multi-bank
```

---

# Referências oficiais

Woovi/OpenPix:

- https://developers.woovi.com/
- https://developers.woovi.com/docs/apis/api-getting-started
- https://developers.woovi.com/docs/webhook/seguranca/webhook-public-keys
- https://developers.openpix.com.br/docs/apis/getting-started-api

Open Finance / Banco Central:

- https://www.bcb.gov.br/estabilidadefinanceira/openfinance
- https://www.bcb.gov.br/meubc/faqs/s/open-finance
- https://openfinancebrasil.org.br/
- https://openfinancebrasil.atlassian.net/wiki/

Nubank:

- https://nubank.com.br/empresas/open-finance
- https://nubank.com.br/nu/open-finance-nubank
