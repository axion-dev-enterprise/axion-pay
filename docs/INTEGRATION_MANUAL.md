# Manual de Integração Técnica — AXION Pay

Este documento descreve como integrar sistemas externos, e-commerces e plataformas ao ecossistema **AXION Pay** via API REST Server-to-Server, cobrindo emissão de **PIX** e **Cartão de Crédito Internacional** com autenticação por chave de API (`axp_live_*`).

---

## 1. Ambientes e Base URLs

| Ambiente | Base URL | Finalidade |
|---|---|---|
| **Produção (Live)** | `https://api.axionenterprise.cloud` | Processamento financeiro real em BRL e USD |
| **Documentação & Console** | `https://pay.axionenterprise.cloud` | Painel de controle, gestão de chaves e métricas |
| **Contrato OpenAPI** | `https://api.axionenterprise.cloud/openapi.json` | Especificação formal OpenAPI 3.1.0 |

---

## 2. Autenticação e Chaves de API

As requisições server-to-server devem enviar a chave de API fornecida no console AXION Pay:

```http
Authorization: Bearer axp_live_SUA_CHAVE_AQUI
```
*Também é suportado o header alternativo `x-api-key: axp_live_SUA_CHAVE_AQUI`.*

### Escopos de Acesso
- `charges:read`: Permite consultar status de cobranças e intenções.
- `charges:write`: Permite emitir cobranças PIX e gerar Payment Intents de Cartão de Crédito.
- `card:write`: Escopo específico para operações de cartão.

> 🔒 **Importante**: Mantenha suas chaves `axp_live_*` estritamente no backend. Nunca exponha credenciais secretas no código cliente (React, Vue, mobile apps).

---

## 3. Padrão Mandatório de Idempotência

Todas as mutações de pagamento (`POST /v1/charges` e `POST /v1/card/payment-intents`) exigem obrigatoriamente o cabeçalho:

```http
Idempotency-Key: <chave-unica-da-transacao>
```

- **Tamanho Máximo**: 255 caracteres (recomenda-se UUID v4 ou ID do pedido no seu sistema).
- **Proteção contra Duplicidade**: Retentativas de rede com a mesma `Idempotency-Key` e valor retornam a resposta original com status `HTTP 201 Created` sem cobrar o cliente duas vezes.
- **Conflito de Valor**: Se a mesma chave for reutilizada com um valor (`amountCents`) diferente, a API retornará `HTTP 409 Conflict`.

---

## 4. Integração de Pagamentos via Cartão de Crédito

Para garantir conformidade PCI-DSS sem fricção, a AXION Pay opera com o modelo de **Payment Intents**:

```
[Seu Backend] ---> POST /v1/card/payment-intents (com API Key) ---> [AXION Pay Core]
      |                                                                   |
      |<--------- Retorna { clientSecret, paymentIntentId } <-------------|
      |
[Seu Frontend] <--- Envia clientSecret para o navegador
      |
      +---> Confirmação via AXION Secure Fields / SDK Elements no cliente
```

### Endpoint
```http
POST https://api.axionenterprise.cloud/v1/card/payment-intents
```

### Cabeçalhos
```http
Authorization: Bearer axp_live_...
Idempotency-Key: ped_8471928374
Content-Type: application/json
```

### Corpo da Requisição (JSON)
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `amountCents` | `integer` | **Sim** | Valor da cobrança em centavos (ex: `1990` = R$ 19,90). Mínimo 100 (R$ 1,00). |
| `customerEmail` | `string (email)` | Não | E-mail do pagador para envio do recibo. |
| `receiptEmail` | `string (email)` | Não | Alias para `customerEmail`. |
| `metadata` | `object` | Não | Dicionário de metadados customizados (`{"orderId": "123", "clientId": "abc"}`). |

#### Exemplo de Payload
```json
{
  "amountCents": 4990,
  "customerEmail": "cliente@email.com",
  "metadata": {
    "order_id": "ped_99812",
    "customer_doc": "12345678900"
  }
}
```

### Resposta de Sucesso (`HTTP 201 Created`)
```json
{
  "paymentIntentId": "pi_3UE9h7FwayvFg6rO0hv8sCQX",
  "clientSecret": "pi_3UE9h7FwayvFg6rO0hv8sCQX_secret_hNEEl2wJfBLolhu2OLVmrKO1H",
  "amountCents": 4990,
  "currency": "BRL",
  "correlationId": "1e6501c7-28a8-4046-b511-d1fc095400ef"
}
```

---

## 5. Integração de Pagamentos via PIX

### Endpoint
```http
POST https://api.axionenterprise.cloud/v1/charges
```

### Cabeçalhos
```http
Authorization: Bearer axp_live_...
Idempotency-Key: pix_ped_99812
Content-Type: application/json
```

### Corpo da Requisição (JSON)
```json
{
  "amountCents": 2500,
  "comment": "Pedido 99812 - Loja Virtual"
}
```

### Resposta de Sucesso (`HTTP 201 Created`)
```json
{
  "id": "e93f7c81-8172-4d1a-9694-81726a54bd21",
  "correlationId": "8b184a1d-cece-4341-9812-6fbcb30d95ed",
  "status": "ACTIVE",
  "amountCents": 2500,
  "currency": "BRL",
  "qrCodeUrl": "https://api.axionenterprise.cloud/v1/charges/8b184a1d.../qr.png",
  "brCode": "00020126580014br.gov.bcb.pix0136...",
  "createdAt": "2026-09-10T15:00:00.000Z",
  "updatedAt": "2026-09-10T15:00:00.000Z"
}
```

### Consulta de Cobrança PIX
```http
GET https://api.axionenterprise.cloud/v1/charges/{correlationId}
Authorization: Bearer axp_live_...
```

---

## 6. Exemplos Práticos de Código

### cURL (Cartão)
```bash
curl -X POST https://api.axionenterprise.cloud/v1/card/payment-intents \
  -H "Authorization: Bearer $AXION_API_KEY" \
  -H "Idempotency-Key: ped_99812_01" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 3990,
    "customerEmail": "suporte@axionenterprise.cloud",
    "metadata": { "origem": "checkout_externo" }
  }'
```

### Node.js / TypeScript (Fetch)
```typescript
const response = await fetch("https://api.axionenterprise.cloud/v1/card/payment-intents", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.AXION_API_KEY}`,
    "Idempotency-Key": crypto.randomUUID(),
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    amountCents: 3990,
    customerEmail: "cliente@dominio.com",
    metadata: { orderId: "12345" }
  })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(`Erro AXION Pay (${response.status}): ${error.error}`);
}

const { clientSecret, paymentIntentId } = await response.json();
// Repassar clientSecret com segurança para inicializar os Secure Fields no frontend
```

### Python (Requests)
```python
import uuid
import requests

headers = {
    "Authorization": f"Bearer {AXION_API_KEY}",
    "Idempotency-Key": str(uuid.uuid4()),
    "Content-Type": "application/json"
}

payload = {
    "amountCents": 3990,
    "customerEmail": "cliente@dominio.com",
    "metadata": {"orderId": "12345"}
}

response = requests.post(
    "https://api.axionenterprise.cloud/v1/card/payment-intents",
    json=payload,
    headers=headers,
    timeout=10
)

data = response.json()
print("Client Secret:", data["clientSecret"])
```

---

## 7. Códigos de Erro e Tratamento

| Código HTTP | Erro | Significado e Ação |
|---|---|---|
| `400 Bad Request` | `Header Idempotency-Key é obrigatório.` | Inclua o cabeçalho `Idempotency-Key` na chamada. |
| `401 Unauthorized` | `API key ausente ou inválida.` | Verifique se a chave enviada no header `Authorization: Bearer` é válida e ativa. |
| `403 Forbidden` | `Escopo insuficiente.` | A chave precisa do escopo `charges:write` ou `card:write`. |
| `409 Conflict` | `Idempotency-Key já usada com outro valor.` | O mesmo `Idempotency-Key` já foi registrado para outro valor. Use uma nova chave única. |
| `422 Unprocessable` | `Merchant inativo ou não encontrado.` | A conta vinculada à chave precisa estar com status `ACTIVE` no console. |
| `429 Too Many Requests` | `Limite de requisições excedido.` | Reduza a taxa de chamadas (rate limit padrão por minuto). |
