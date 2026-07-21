import { logger } from "../../utils/logger.js";

function normalizePhoneNumber(value) {
  const digits = String(value || "")
    .replace(/[^\d]+/g, "")
    .trim();
  if (!digits) return "";

  // Heuristica BR: se vier 10/11 digitos, prefixa 55.
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

function pickCustomerPhone(customer, metadata) {
  const candidates = [
    customer?.phone_number,
    customer?.phoneNumber,
    customer?.phone,
    customer?.whatsapp,
    metadata?.customer?.phone_number,
    metadata?.customer_phone,
    metadata?.customer_whatsapp
  ];

  for (const candidate of candidates) {
    const normalized = normalizePhoneNumber(candidate);
    if (normalized) return normalized;
  }
  return "";
}

export async function createCardTransactionWithInfinite({
  amount_cents,
  customer,
  metadata
}) {
  const normalizedTag = String(metadata?.pay_tag || "").trim().toLowerCase();
  const handle =
    metadata?.handle ||
    (normalizedTag === "anne-tom" ? "annetom" : "anne-tom");
  const transactionId = metadata.transactionId;

  // Payload configurado conforme documentacao da InfinitePay
  const webhookUrl =
    process.env.INFINITEPAY_WEBHOOK_URL ||
    metadata?.webhook_url ||
    "https://api.annetom.com/api/webhook-infinitepay";

  const payload = {
    handle,
    order_nsu: transactionId,
    redirect_url: metadata?.redirect_url || metadata?.return_url || "https://annetom.com/payconfirmed",
    webhook_url: webhookUrl,
    items: [
      {
        quantity: 1,
        price: amount_cents,
        description: `Pedido ${transactionId}`
      }
    ],
    customer: {
      name: customer?.name || "Cliente",
      email: customer?.email || "email@teste.com",
      phone_number: pickCustomerPhone(customer, metadata),
      // document pode ser guardado internamente, mas não vai no payload público
    },
    address: {
      cep: metadata?.address?.cep || "",
      street: metadata?.address?.street || "",
      neighborhood: metadata?.address?.neighborhood || "",
      number: metadata?.address?.number || "",
      complement: metadata?.address?.complement || ""
    }
  };

  if (!payload.customer.phone_number) {
    return {
      success: false,
      error:
        "InfinitePay exige customer.phone_number. Envie o telefone via customer.phone_number (recomendado) ou customer.whatsapp."
    };
  }

  try {
    logger.info({ payload }, "Enviando requisicao para InfinitePay");

    const response = await fetch("https://api.infinitepay.io/invoices/public/checkout/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Log da resposta para visualizacao no console/arquivo
    logger.info({ data }, "Resposta da InfinitePay recebida");
    logger.debug({ response: data }, "InfinitePay payload recebido");

    if (!response.ok) {
      logger.error({ status: response.status, data }, "Erro na resposta da InfinitePay");
      return {
        success: false,
        error: JSON.stringify(data)
      };
    }

    return {
      success: true,
      status: "pending", // Link gerado, aguardando acao do usuario
      provider: "infinity",
      providerReference: data.id || transactionId,
      raw: data
    };
  } catch (error) {
    logger.error({ error }, "Excecao ao chamar InfinitePay");
    return {
      success: false,
      error: error.message
    };
  }
}
