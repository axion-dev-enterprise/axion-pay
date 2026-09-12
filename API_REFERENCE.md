# AXION Pay API Reference (v1.0)

Documentação oficial da API REST financeira de alta disponibilidade da **AXION Pay**.

- **Base URL Oficial**: `https://api.axionenterprise.cloud`
- **Console / Dashboard**: `https://pay.axionenterprise.cloud`
- **Especificação OpenAPI 3.1.0**: `https://api.axionenterprise.cloud/openapi.json`
- **Protocolo de Segurança**: TLS 1.3 Strict / HSTS

---

## 1. Autenticação e Cabeçalhos Obrigatórios

Todas as chamadas à API da AXION Pay exigem autenticação via Bearer Token utilizando chaves de API geradas no painel.

```http
Authorization: Bearer axp_live_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
Accept: application/json
Idempotency-Key: uuid-ou-chave-unica-da-mutacao
```

### Chaves e Ambientes
| Prefixo | Ambiente | Descrição |
|---|---|---|
| `axp_live_...` | **Produção** | Processa transações reais via Pix e Cartão de Crédito. |
| `axp_test_...` | **Sandbox** | Ambiente de testes isolado com fundos simulados. |

### Escopos de Chave (Scopes)
- `charges:read` — Consultar status de cobranças e transações
- `charges:write` — Criar cobranças Pix e gerar PaymentIntents de cartão
- `webhooks:read` / `webhooks:write` — Gerenciar endpoints de notificação
- `subscriptions:read` / `subscriptions:write` — Gerenciar planos e recorrências

---

## 2. Health & Sandbox

### `GET /health`
Verifica a saúde operacional da infraestrutura (PostgreSQL, Redis e Gateways).
- **Autenticação**: Nenhuma (Público)
- **Resposta (200 OK)**:
```json
{
  "status": "ok",
  "service": "axion-pay-core",
  "version": "1.0.0",
  "timestamp": "2026-09-12T20:00:00.000Z",
  "postgres": "connected",
  "redis": "connected"
}
```

### `GET /v1/sandbox/validate`
Valida uma credencial sandbox e atesta o isolamento do ambiente de teste.
- **Autenticação**: `Bearer axp_test_...`
- **Resposta (200 OK)**:
```json
{
  "environment": "sandbox",
  "isolated": true,
  "livePaymentsAllowed": false,
  "merchant": {
    "id": "mer_sandbox_demo",
    "tradingName": "Ambiente de Testes AXION Pay"
  }
}
```

---

## 3. Cobranças PIX (Charges)

### `POST /v1/charges`
Cria uma cobrança instantânea com Pix dinâmico, QR Code em Base64 e Pix Copia e Cola.

- **Autenticação**: `Bearer <API_KEY>` (`charges:write`)
- **Headers Mandatórios**: `Idempotency-Key`
- **Body**:
```json
{
  "correlationId": "pedido_10482",
  "value": 2990,
  "comment": "Assinatura Mensal - Plano Pro",
  "expiresInSeconds": 3600,
  "customer": {
    "name": "Carlos Silva",
    "email": "carlos.silva@email.com",
    "taxId": "12345678909",
    "phone": "+5511999998888"
  },
  "metadata": {
    "orderId": "10482",
    "source": "checkout_loja"
  }
}
```
- **Resposta (201 Created)**:
```json
{
  "charge": {
    "correlationId": "pedido_10482",
    "value": 2990,
    "status": "ACTIVE",
    "brCode": "00020101021226830014br.gov.bcb.pix...",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgo...",
    "expiresAt": "2026-09-12T21:00:00.000Z",
    "createdAt": "2026-09-12T20:00:00.000Z"
  }
}
```

### `GET /v1/charges/:correlationId`
Consulta o status atualizado de uma cobrança Pix.
- **Autenticação**: `Bearer <API_KEY>` (`charges:read`)
- **Status Possíveis**: `ACTIVE`, `COMPLETED`, `EXPIRED`, `REFUNDED`
- **Resposta (200 OK)**:
```json
{
  "charge": {
    "correlationId": "pedido_10482",
    "value": 2990,
    "status": "COMPLETED",
    "paidAt": "2026-09-12T20:02:15.000Z",
    "paymentMethod": "PIX",
    "endToEndId": "E18236120202609122002s0921"
  }
}
```

---

## 4. Cartão de Crédito (Card Payments)

### `GET /v1/card/config`
Retorna a chave pública para inicialização do Stripe Elements / Campos Seguros AXION.
- **Autenticação**: Nenhuma (Público)
- **Resposta (200 OK)**:
```json
{
  "publishableKey": "pk_live_xxxxxxxxxxxxxxxxxxxxxxxx",
  "supportedMethods": ["card"],
  "threeDSecureRequired": "recommended"
}
```

### `POST /v1/card/payment-intents`
Gera uma intenção de pagamento criptografada (`PaymentIntent`) para confirmação no frontend.
- **Autenticação**: `Bearer <API_KEY>` (`charges:write`) ou Sessão AXION
- **Headers Mandatórios**: `Idempotency-Key`
- **Body**:
```json
{
  "amountCents": 5990,
  "currency": "brl",
  "customerEmail": "cliente@email.com",
  "customerName": "Ana Paula",
  "metadata": {
    "orderId": "pedido_9921"
  }
}
```
- **Resposta (201 Created)**:
```json
{
  "paymentIntentId": "pi_3Nxxxx...",
  "clientSecret": "pi_3Nxxxx_secret_yyyy...",
  "amountCents": 5990,
  "currency": "brl",
  "status": "requires_payment_method"
}
```

---

## 5. Links de Pagamento Autônomos (Payment Links)

Links públicos prontos para venda direta sem necessidade de loja virtual ou site prévio.

### `POST /v1/payment-links`
- **Autenticação**: `Bearer <API_KEY>` (`charges:write`)
- **Body**:
```json
{
  "title": "Mentoria Executiva VIP",
  "description": "Acesso a 4 sessões individuais de mentoria",
  "amountCents": 49700,
  "allowedPaymentMethods": ["PIX", "CARD"],
  "maxInstallments": 12,
  "slug": "mentoria-vip-2026",
  "redirectUrl": "https://seusite.com/obrigado",
  "bannerUrl": "https://seusite.com/banner.jpg"
}
```

### `GET /v1/payment-links/:id`
Retorna os dados públicos para renderização do checkout de um link.
- **Autenticação**: Pública

### `POST /v1/payment-links/:id/pay`
Processa a liquidação financeira no checkout do link.
- **Autenticação**: Pública (dados seguros)

---

## 6. Assinaturas Recorrentes (Subscriptions)

### `POST /v1/subscriptions`
Cria um plano ou cobrança recorrente automatizada.
- **Autenticação**: `Bearer <API_KEY>` (`charges:write`)
- **Body**:
```json
{
  "customerEmail": "assinante@empresa.com",
  "customerName": "Assinante Exemplo",
  "amountCents": 9900,
  "interval": "month",
  "trialDays": 7,
  "metadata": {
    "planCode": "plano_pro_anual"
  }
}
```
- **Resposta (201 Created)**:
```json
{
  "subscription": {
    "id": "sub_9281a8c",
    "status": "ACTIVE",
    "amountCents": 9900,
    "interval": "month",
    "currentPeriodStart": "2026-09-12T20:00:00.000Z",
    "currentPeriodEnd": "2026-10-12T20:00:00.000Z",
    "portalToken": "pt_8192837102938102"
  }
}
```

### `POST /v1/subscriptions/:id/cancel`
Cancela a assinatura imediatamente ou ao final do ciclo.
- **Body**: `{"immediately": false}`

---

## 7. Portal do Assinante Self-Service

Permite ao cliente final visualizar faturas, trocar cartão e gerenciar sua assinatura sem login no sistema principal.

- `GET /v1/portal/subscriptions/:token` — Carrega dados da assinatura e histórico de faturas
- `POST /v1/portal/subscriptions/:token/cancel` — Solicita cancelamento self-service
- `POST /v1/portal/subscriptions/:token/payment-method` — Atualiza o cartão salvo
- `POST /v1/portal/subscriptions/:token/reactivate` — Reativa uma assinatura pausada

---

## 8. Motor de Webhooks

### Cadastro de Webhook (`POST /v1/merchant/webhooks`)
- **Body**:
```json
{
  "url": "https://api.seusite.com/webhooks/axion-pay",
  "events": [
    "charge.completed",
    "charge.failed",
    "payment_intent.succeeded",
    "subscription.created",
    "subscription.paid",
    "subscription.canceled"
  ]
}
```
- **Resposta**: Retorna `id`, `url`, `events` e `secret` (chave `whsec_...` para validação HMAC SHA-256).

### Validação de Notificação Recebida
- Toda requisição inbound da AXION Pay inclui o cabeçalho `x-axion-signature`.
- O cálculo da assinatura deve ser executado sobre o **corpo bruto (raw buffer)**:
$$	ext{Assinatura} = 	ext{HMAC-SHA256}(	ext{rawBody}, 	ext{webhookSecret})$$

---

## 9. Códigos de Retorno e RFC 7807

A API AXION Pay responde exclusivamente com códigos HTTP padronizados e payload de erro estruturado conforme a RFC 7807:

```json
{
  "type": "https://api.axionenterprise.cloud/errors/invalid_parameters",
  "title": "Parâmetros Inválidos",
  "status": 422,
  "detail": "O campo 'customer.taxId' deve conter um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.",
  "instance": "/v1/charges",
  "traceId": "trace_9128371928371"
}
```

| HTTP Status | Significado |
|---|---|
| `200 OK` | Consulta ou mutação concluída com sucesso. |
| `201 Created` | Recurso (cobrança, webhook, link) criado. |
| `400 Bad Request` | Formato JSON inválido ou ausência de campos mínimos. |
| `401 Unauthorized` | Chave de API inválida, revogada ou expirada. |
| `403 Forbidden` | Chave de API não possui o escopo necessário para a rota. |
| `404 Not Found` | Recurso (cobrança, assinatura) não localizado. |
| `409 Conflict` | Conflito de concorrência ou correlationId duplicado. |
| `422 Unprocessable` | Regra de negócio ou documento do pagador inválido. |
| `429 Too Many Requests` | Limite de taxa (Rate Limit) excedido. |
| `500 Internal Error` | Erro não previsto; consulte o `traceId` com o suporte. |
