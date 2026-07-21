# Manual de Integracao Tecnica

Este manual descreve como integrar sua aplicacao ao Gateway de Pagamentos,
com foco em PIX e cartao via provedores terceiros.

## 1. Autenticacao

Todas as requisicoes para `/payments` devem incluir:

```http
x-api-key: SUA_CHAVE_DE_API
Accept: application/json
Content-Type: application/json
```

Alternativa:

```http
Authorization: Bearer SUA_CHAVE_DE_API
```

Ambientes (exemplo):

- Sandbox: `https://sandbox.api.seugateway.com`
- Producao: `https://api.seugateway.com`

## 2. Criar cobranca PIX

### Endpoint

```http
POST /payments/pix
```

### Request JSON

```json
{
  "amount": 129.90,
  "currency": "BRL",
  "customer": {
    "name": "Joao Silva",
    "email": "joao@example.com"
  },
  "metadata": {
    "orderId": "548",
    "source": "ecommerce"
  }
}
```

### Resposta esperada (sucesso)

```json
{
  "ok": true,
  "transaction": {
    "id": "uuid",
    "status": "pending",
    "providerReference": "PIX-1700000000000",
    "metadata": {
      "transactionId": "uuid"
    }
  }
}
```

O `transaction.id` deve ser armazenado para futuras consultas e conciliacao.

## 3. Consultar pagamento

```http
GET /payments/{transactionId}
```

Resposta (exemplo pago):

```json
{
  "ok": true,
  "transaction": {
    "id": "uuid",
    "status": "paid",
    "method": "pix",
    "providerReference": "BKP-9981"
  }
}
```

## 4. Webhooks

Configure um endpoint no seu sistema e valide:

1. Assinatura HMAC via `x-*-signature`.
2. Timestamp (opcional) quando `WEBHOOK_REQUIRE_TIMESTAMP=true`.

Para PIX, o payload esperado no gateway e:

```json
{
  "providerReference": "PIX-1700000000000",
  "event": "PIX_CONFIRMED"
}
```

## 5. Cartao via provedor

Para cartao, recomenda-se:

- Usar um provedor como Stripe, Pagar.me, Iugu ou similar.
- Enviar `card_hash` quando disponivel (fluxo PCI-friendly).
- O gateway consolida status e registra a transacao.

Exemplo:

```json
{
  "amount": 200.00,
  "currency": "BRL",
  "capture": false,
  "card_hash": "card_tok_abc123",
  "metadata": {
    "orderId": "999"
  }
}
```

## 6. Boas praticas

- Use `Idempotency-Key` em criacoes para evitar duplicidade.
- Configure timeouts e retentativas.
- Implemente logs estruturados com `transactionId` e `x-request-id`.

## 7. OpenAPI

O contrato completo esta em `docs/openapi.yaml`.
