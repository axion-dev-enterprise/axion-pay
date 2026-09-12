# Guia Oficial: Checkouts Personalizados (Headless / White-Label) — AXION Pay

Este guia orienta engenheiros e lojistas a construir **checkouts próprios, transparentes e 100% personalizados** em suas lojas, aplicações web ou apps mobile, mantendo a identidade visual da sua marca e utilizando a infraestrutura financeira de alta performance da **AXION Pay** apenas como provedor de liquidação via API REST.

---

## 1. Visão Geral da Arquitetura Headless

Ao criar um checkout transparente com a AXION Pay, **seu cliente nunca sai do seu domínio**. Não há redirecionamento externo para gateways de terceiros.

```
+-------------------------------------------------------------------------+
|                              SEU DOMÍNIO                                |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |  Frontend do Cliente  |              |    Backend do Cliente    |   |
|   | (React, Vue, HTML/JS) |              |  (Node, Python, PHP, Go) |   |
|   +-----------+-----------+              +------------+-------------+   |
|               |                                       |                 |
|               | 1. Envia Pedido / Carrinho            |                 |
|               +-------------------------------------->+                 |
|               |                                       |                 |
|               |                                       | 2. Cria Cobrança|
|               |                                       |    (API Key)    |
|               |                                       v                 |
|               |                            +------------------------+   |
|               |                            |     AXION PAY API      |   |
|               |                            | api.axionenterprise... |   |
|               |                            +------------+-----------+   |
|               |                                         |               |
|               | 4. Retorna QR Code / ClientSecret       | 3. Retorna    |
|               |    para o Frontend                      |    Payload    |
|               +<----------------------------------------+               |
|               |                                                         |
|               | 5. Renderiza Pix ou Cartão Seguro                       |
|               |                                                         |
|               | 6. Pagamento Confirmado (Webhook Assíncrono)            |
|               |    AXION Pay -> Seu Backend                             |
+---------------+---------------------------------------------------------+
```

### Por que usar Checkout Headless?
- **Conversão Máxima**: Elimina o atrito de redirecionamentos que causam desistência no funil de vendas.
- **Identidade da Marca**: Layout, tipografia, cores, botões e mensagens pertencem integralmente à sua aplicação.
- **Segurança PCI-DSS**: Dados sensíveis de cartão de crédito não passam pelo seu servidor (trafegam via campos seguros tokenizados AXION/Stripe).
- **Conciliação e Webhooks**: Notificação instantânea no seu servidor via Webhook com assinatura HMAC SHA-256.

---

## 2. Pré-Requisitos e Credenciais

1. Acesse o console [AXION Pay Dashboard](https://pay.axionenterprise.cloud).
2. Vá em **Chaves de API** (`/dashboard/api-keys`) e gere uma nova chave de produção (`axp_live_...`).
3. Para testes de integração em ambiente seguro, utilize chaves com prefixo `axp_test_...`.
4. Configure a URL base da API:
   - **Produção**: `https://api.axionenterprise.cloud`

> [!WARNING]
> **Segurança Mandatória**: NUNCA exponha sua chave privada `axp_live_...` no código frontend do navegador. Todas as requisições autenticadas com a chave privada DEVEM partir exclusivamente do seu backend server-side.

---

## 3. Implementação: Checkout Pix Transparente

O fluxo Pix é instantâneo e possui três passos:
1. Seu frontend envia os dados do pedido ao seu backend.
2. Seu backend chama `POST /v1/charges` na AXION Pay com `Idempotency-Key`.
3. Seu frontend exibe o QR Code dinâmico e o código "Pix Copia e Cola", fazendo polling de confirmação ou aguardando o Webhook.

### 3.1. Backend (Node.js / TypeScript)

```typescript
import express from "express";

const app = express();
app.use(express.json());

const AXION_API_URL = "https://api.axionenterprise.cloud";
const AXION_API_KEY = process.env.AXION_PAY_API_KEY!; // axp_live_...

app.post("/api/checkout/pix", async (req, res) => {
  const { orderId, amountInCents, customer } = req.body;

  try {
    const response = await fetch(`${AXION_API_URL}/v1/charges`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AXION_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `order_${orderId}_${Date.now()}`,
      },
      body: JSON.stringify({
        correlationId: `order_${orderId}`,
        value: amountInCents, // Valor em centavos (ex: 4990 = R$ 49,90)
        customer: {
          name: customer.name,
          email: customer.email,
          taxId: customer.taxId.replace(/\D/g, ""), // CPF ou CNPJ apenas dígitos
          phone: customer.phone,
        },
        comment: `Pedido #${orderId} na Minha Loja`,
        expiresInSeconds: 3600, // 1 hora de validade
        metadata: {
          orderId: String(orderId),
          tenantStore: "minha-loja-oficial",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Erro ao gerar PIX" });
    }

    // Retorna para o seu frontend os dados necessários para pagar
    return res.json({
      correlationId: data.charge.correlationId,
      qrCodeImage: data.charge.qrCodeImage, // Imagem Base64 ou URL do QR Code
      brCode: data.charge.brCode, // Código Pix Copia e Cola
      expiresAt: data.charge.expiresAt,
    });
  } catch (error) {
    console.error("Erro no checkout Pix:", error);
    return res.status(500).json({ error: "Falha interna ao processar pagamento" });
  }
});

// Endpoint para consultar status em tempo real
app.get("/api/checkout/status", async (req, res) => {
  const correlationId = req.query.correlationId as string;
  try {
    const response = await fetch(`${AXION_API_URL}/v1/charges/${correlationId}`, {
      headers: { "Authorization": `Bearer ${AXION_API_KEY}` }
    });
    const data = await response.json();
    return res.json({ status: data.charge?.status });
  } catch (err) {
    return res.status(500).json({ error: "Falha ao verificar status" });
  }
});
```

### 3.2. Frontend (React / Tailwind Component Drop-in)

```tsx
import React, { useState, useEffect } from "react";

interface PixCheckoutProps {
  orderId: string;
  amount: number; // ex: 49.90
  customer: { name: string; email: string; taxId: string; phone: string };
  onSuccess: () => void;
}

export function CustomPixCheckout({ orderId, amount, customer, onSuccess }: PixCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    correlationId: string;
    qrCodeImage: string;
    brCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  // 1. Gera o Pix ao iniciar o checkout
  const handleGeneratePix = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amountInCents: Math.round(amount * 100),
          customer,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPixData(data);
      } else {
        alert(data.error || "Erro ao gerar Pix");
      }
    } catch (err) {
      alert("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Polling de confirmação em tempo real (opcional ao Webhook)
  useEffect(() => {
    if (!pixData || paid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?correlationId=${pixData.correlationId}`);
        const data = await res.json();
        if (data.status === "COMPLETED") {
          setPaid(true);
          clearInterval(interval);
          onSuccess();
        }
      } catch (err) {
        // Ignora erros de rede transitórios
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [pixData, paid, onSuccess]);

  const handleCopy = () => {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (paid) {
    return (
      <div className="p-8 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
        <h3 className="text-xl font-bold text-emerald-400">Pagamento Confirmado!</h3>
        <p className="text-sm text-gray-300 mt-2">Seu pedido foi aprovado com sucesso.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0f1712] border border-[#213428] rounded-2xl max-w-md mx-auto text-white">
      <h2 className="text-lg font-bold mb-1">Pague com Pix</h2>
      <p className="text-xs text-gray-400 mb-6">Aprovação imediata e 100% segura via AXION Pay</p>

      {!pixData ? (
        <button
          onClick={handleGeneratePix}
          disabled={loading}
          className="w-full py-3 bg-[#00e66b] hover:bg-[#69f0ae] text-black font-bold text-sm rounded-xl transition cursor-pointer"
        >
          {loading ? "Gerando QR Code..." : `Gerar Pix de R$ ${amount.toFixed(2)}`}
        </button>
      ) : (
        <div className="space-y-5 text-center">
          <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
            <img
              src={pixData.qrCodeImage.startsWith("data:") ? pixData.qrCodeImage : `data:image/png;base64,${pixData.qrCodeImage}`}
              alt="QR Code Pix"
              className="w-48 h-48 mx-auto object-contain"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 block">Pix Copia e Cola:</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={pixData.brCode}
                className="w-full bg-[#18261e] border border-[#2d4737] rounded-lg px-3 py-2 text-xs font-mono text-gray-200"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-[#00e66b] hover:bg-[#69f0ae] text-black text-xs font-bold rounded-lg shrink-0 cursor-pointer"
              >
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Aguardando pagamento no seu banco...
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Implementação: Checkout Cartão de Crédito Transparente

Para processar cartões de crédito sem risco de responsabilidade PCI-DSS no seu servidor:
1. Seu backend cria um **PaymentIntent** na API AXION Pay (`POST /v1/card/payment-intents`).
2. A API AXION Pay retorna um `clientSecret` seguro.
3. Seu frontend utiliza a biblioteca Stripe Elements vinculada à chave pública obtida em `GET /v1/card/config`.
4. O cliente preenche os dados do cartão, valida 3D Secure no modal do banco e o pagamento é liquidado.

### 4.1. Backend: Criar PaymentIntent

```typescript
app.post("/api/checkout/card", async (req, res) => {
  const { orderId, amountInCents, customer } = req.body;

  try {
    const response = await fetch(`${AXION_API_URL}/v1/card/payment-intents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AXION_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `card_order_${orderId}_${Date.now()}`,
      },
      body: JSON.stringify({
        amountCents: amountInCents, // Valor em centavos
        currency: "brl", // ou "usd"
        customerEmail: customer.email,
        customerName: customer.name,
        metadata: {
          orderId: String(orderId),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || "Falha ao iniciar pagamento com cartão" });
    }

    return res.json({
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});
```

### 4.2. Frontend: Integração com Stripe Elements

```html
<!-- No cabeçalho da sua página -->
<script src="https://js.stripe.com/v3/"></script>
```

```javascript
// No script do seu checkout frontend:
async function initCardCheckout(clientSecret) {
  // 1. Obtém a chave pública configurada na AXION Pay
  const configRes = await fetch("https://api.axionenterprise.cloud/v1/card/config");
  const { publishableKey } = await configRes.json();

  const stripe = Stripe(publishableKey);
  const elements = stripe.elements({ clientSecret, appearance: { theme: 'night' } });

  const paymentElement = elements.create("payment");
  paymentElement.mount("#card-element-container");

  const form = document.getElementById("checkout-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: "https://seusite.com/checkout/obrigado",
      },
      redirect: "if_required", // Evita redirecionar se o banco não exigir 3D Secure
    });

    if (error) {
      alert(error.message);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      alert("Pagamento aprovado!");
      window.location.href = "/checkout/obrigado?orderId=" + orderId;
    }
  });
}
```

---

## 5. Webhooks: Recebimento e Confirmação Segura

Para garantir que pedidos sejam liberados mesmo se o cliente fechar a aba do navegador antes do retorno:

1. Acesse o painel **Webhooks** (`/dashboard/webhooks`).
2. Cadastre a URL do seu endpoint (ex: `https://api.seusite.com/webhooks/axion-pay`).
3. Selecione os eventos desejados:
   - `charge.completed` (PIX aprovado)
   - `charge.failed` (PIX cancelado/expirado)
   - `payment_intent.succeeded` (Cartão aprovado)
   - `subscription.paid` (Assinatura renovada)
4. Copie o **Webhook Secret** (`whsec_...`).

### Validação de Assinatura HMAC SHA-256 no seu Backend

Toda notificação enviada pela AXION Pay inclui o cabeçalho `x-axion-signature`. Você deve validar a autenticidade antes de processar o evento:

```typescript
import crypto from "crypto";
import express from "express";

const app = express();

// IMPORTANTE: Obtenha o corpo bruto (raw body) para a validação criptográfica
app.post("/webhooks/axion-pay", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-axion-signature"] as string;
  const webhookSecret = process.env.AXION_WEBHOOK_SECRET!;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("Assinatura de Webhook inválida! Requisição descartada.");
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString());

  switch (event.type) {
    case "charge.completed":
      const { correlationId, value, metadata } = event.data;
      console.log(`[AXION PAY] PIX Recebido: R$ ${value / 100} - Pedido ${metadata?.orderId}`);
      // TODO: Atualizar status do pedido para 'PAGO' no seu banco de dados
      // TODO: Disparar nota fiscal e liberar acesso do cliente
      break;

    case "payment_intent.succeeded":
      console.log(`[AXION PAY] Cartão Aprovado para Pedido: ${event.data.metadata?.orderId}`);
      break;

    default:
      console.log(`Evento ignorado: ${event.type}`);
  }

  // Responda HTTP 200 rapidamente para confirmar a entrega
  return res.status(200).json({ received: true });
});
```

---

## 6. Boas Práticas para Checkouts em Alta Escala

1. **Idempotência Obrigatória**: Sempre envie o cabeçalho `Idempotency-Key` com identificadores únicos compostos (ex: `checkout_${cartId}_${userId}`) para evitar cobranças duplicadas caso o cliente clique repetidamente no botão.
2. **Tratamento de Timeout e Retries**: Se sua chamada de rede falhar por timeout, faça até 3 tentativas com backoff exponencial mantendo **o mesmo Idempotency-Key**.
3. **Status Code Handling**: Trate respostas conforme a especificação oficial:
   - `200 OK` / `201 Created`: Sucesso operacional.
   - `400 Bad Request`: Parâmetros ausentes ou mal formatados.
   - `401 Unauthorized`: API Key inválida ou ausente.
   - `409 Conflict`: Conflito de correlação ou requisição concorrente em processamento.
   - `422 Unprocessable Entity`: Documento CPF/CNPJ inválido ou dados do pagador incorretos.
4. **Armazenamento de Metadados**: Use o campo `metadata` para armazenar `orderId`, `userId`, `sku`, `couponCode` e `utm_source`, facilitando relatórios e conciliação automática.
