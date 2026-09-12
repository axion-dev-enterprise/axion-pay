import crypto from 'node:crypto';
import type { Pool } from 'pg';

type Database = Pick<Pool, 'query'>;

export type MerchantWhatsappSettings = {
  id?: string;
  merchantId: string;
  enabled: boolean;
  notifyOnPixCreated: boolean;
  notifyOnPaymentApproved: boolean;
  notifyOnPixExpiring: boolean;
  notifyOnSubscriptionFailed: boolean;
  templatePixCreated: string;
  templatePaymentApproved: string;
  templatePixExpiring: string;
  templateSubscriptionFailed: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MerchantWhatsappLog = {
  id: string;
  merchantId: string;
  chargeId: string | null;
  recipientPhone: string;
  eventType: string;
  messageBody: string;
  status: 'QUEUED' | 'DELIVERED' | 'FAILED';
  error: string | null;
  createdAt: string;
};

export const DEFAULT_WHATSAPP_TEMPLATES = {
  pix_created:
    'Olá, {{customer_name}}! 👋\n\nSua cobrança para *{{product_title}}* no valor de *{{amount}}* foi gerada com sucesso via Pix.\n\n📱 *Código Pix Copia e Cola:*\n```{{pix_code}}```\n\nAbra o app do seu banco, selecione a opção "Pix Copia e Cola" e cole o código acima para concluir o pagamento com segurança.',
  payment_approved:
    '✅ *Pagamento Confirmado!*\n\nOlá, {{customer_name}}! Identificamos o seu pagamento de *{{amount}}* referente a *{{product_title}}*.\n\n🧾 *Comprovante Digital:* {{receipt_url}}\n\nObrigado por comprar conosco!',
  pix_expiring:
    '⏳ *Lembrete: Cobrança Pix próxima do vencimento*\n\nOlá, {{customer_name}}! Sua cobrança de *{{amount}}* para *{{product_title}}* expira em instantes.\n\n📱 *Pix Copia e Cola:*\n```{{pix_code}}```\n\nGaranta seu pedido antes da expiração da chave.',
  subscription_failed:
    '⚠️ *Aviso de Renovação - {{merchant_name}}*\n\nOlá, {{customer_name}}! Não conseguimos processar a renovação da sua assinatura (*{{product_title}}*) no valor de *{{amount}}*.\n\n💳 Para manter seu serviço ativo, atualize seu cartão de crédito com segurança no link:\n{{checkout_url}}',
};

export function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function interpolateVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\s*\\{\\s*${key}\\s*\\}\\s*\\}`, 'g');
    result = result.replace(regex, value ?? '');
  }
  return result;
}

const BRIDGE_URLS = [
  process.env.AXION_COMM_BRIDGE_URL,
  'http://127.0.0.1:3010/send',
  'http://axion-waba-dispatch:3000/send',
  'http://127.0.0.1:3000/send',
].filter(Boolean) as string[];

async function sendViaBridge(chatId: string, messageText: string): Promise<{ success: boolean; error?: string }> {
  const formattedChatId = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
  const payload = {
    chatId: formattedChatId,
    message: messageText,
  };

  let lastError = 'Nenhum bridge disponível';
  for (const url of BRIDGE_URLS) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'AXION-Pay-Core-Notifier/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4_000),
      });

      if (response.ok) {
        return { success: true };
      }
      lastError = `Bridge HTTP ${response.status}: ${await response.text().catch(() => '')}`;
    } catch (err: any) {
      lastError = err.message || 'Timeout/Connection error';
    }
  }

  return { success: false, error: lastError };
}

export async function getMerchantWhatsappSettings(
  database: Database,
  merchantId: string,
): Promise<MerchantWhatsappSettings> {
  const result = await database.query<{
    id: string;
    merchant_id: string;
    enabled: boolean;
    notify_on_pix_created: boolean;
    notify_on_payment_approved: boolean;
    notify_on_pix_expiring: boolean;
    notify_on_subscription_failed: boolean;
    template_pix_created: string | null;
    template_payment_approved: string | null;
    template_pix_expiring: string | null;
    template_subscription_failed: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT * FROM merchant_whatsapp_settings WHERE merchant_id = $1`,
    [merchantId],
  );

  if (result.rowCount && result.rows[0]) {
    const row = result.rows[0];
    return {
      id: row.id,
      merchantId: row.merchant_id,
      enabled: row.enabled,
      notifyOnPixCreated: row.notify_on_pix_created,
      notifyOnPaymentApproved: row.notify_on_payment_approved,
      notifyOnPixExpiring: row.notify_on_pix_expiring,
      notifyOnSubscriptionFailed: row.notify_on_subscription_failed,
      templatePixCreated: row.template_pix_created || DEFAULT_WHATSAPP_TEMPLATES.pix_created,
      templatePaymentApproved: row.template_payment_approved || DEFAULT_WHATSAPP_TEMPLATES.payment_approved,
      templatePixExpiring: row.template_pix_expiring || DEFAULT_WHATSAPP_TEMPLATES.pix_expiring,
      templateSubscriptionFailed: row.template_subscription_failed || DEFAULT_WHATSAPP_TEMPLATES.subscription_failed,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  return {
    merchantId,
    enabled: false,
    notifyOnPixCreated: true,
    notifyOnPaymentApproved: true,
    notifyOnPixExpiring: false,
    notifyOnSubscriptionFailed: true,
    templatePixCreated: DEFAULT_WHATSAPP_TEMPLATES.pix_created,
    templatePaymentApproved: DEFAULT_WHATSAPP_TEMPLATES.payment_approved,
    templatePixExpiring: DEFAULT_WHATSAPP_TEMPLATES.pix_expiring,
    templateSubscriptionFailed: DEFAULT_WHATSAPP_TEMPLATES.subscription_failed,
  };
}

export async function saveMerchantWhatsappSettings(
  database: Database,
  merchantId: string,
  settings: Partial<MerchantWhatsappSettings>,
): Promise<MerchantWhatsappSettings> {
  const current = await getMerchantWhatsappSettings(database, merchantId);

  const enabled = settings.enabled !== undefined ? settings.enabled : current.enabled;
  const notifyOnPixCreated =
    settings.notifyOnPixCreated !== undefined ? settings.notifyOnPixCreated : current.notifyOnPixCreated;
  const notifyOnPaymentApproved =
    settings.notifyOnPaymentApproved !== undefined ? settings.notifyOnPaymentApproved : current.notifyOnPaymentApproved;
  const notifyOnPixExpiring =
    settings.notifyOnPixExpiring !== undefined ? settings.notifyOnPixExpiring : current.notifyOnPixExpiring;
  const notifyOnSubscriptionFailed =
    settings.notifyOnSubscriptionFailed !== undefined ? settings.notifyOnSubscriptionFailed : current.notifyOnSubscriptionFailed;

  const templatePixCreated = settings.templatePixCreated || current.templatePixCreated;
  const templatePaymentApproved = settings.templatePaymentApproved || current.templatePaymentApproved;
  const templatePixExpiring = settings.templatePixExpiring || current.templatePixExpiring;
  const templateSubscriptionFailed = settings.templateSubscriptionFailed || current.templateSubscriptionFailed;

  const result = await database.query<{
    id: string;
    merchant_id: string;
    enabled: boolean;
    notify_on_pix_created: boolean;
    notify_on_payment_approved: boolean;
    notify_on_pix_expiring: boolean;
    notify_on_subscription_failed: boolean;
    template_pix_created: string;
    template_payment_approved: string;
    template_pix_expiring: string;
    template_subscription_failed: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO merchant_whatsapp_settings (
       merchant_id, enabled, notify_on_pix_created, notify_on_payment_approved,
       notify_on_pix_expiring, notify_on_subscription_failed,
       template_pix_created, template_payment_approved, template_pix_expiring,
       template_subscription_failed, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT (merchant_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       notify_on_pix_created = EXCLUDED.notify_on_pix_created,
       notify_on_payment_approved = EXCLUDED.notify_on_payment_approved,
       notify_on_pix_expiring = EXCLUDED.notify_on_pix_expiring,
       notify_on_subscription_failed = EXCLUDED.notify_on_subscription_failed,
       template_pix_created = EXCLUDED.template_pix_created,
       template_payment_approved = EXCLUDED.template_payment_approved,
       template_pix_expiring = EXCLUDED.template_pix_expiring,
       template_subscription_failed = EXCLUDED.template_subscription_failed,
       updated_at = now()
     RETURNING *`,
    [
      merchantId,
      enabled,
      notifyOnPixCreated,
      notifyOnPaymentApproved,
      notifyOnPixExpiring,
      notifyOnSubscriptionFailed,
      templatePixCreated,
      templatePaymentApproved,
      templatePixExpiring,
      templateSubscriptionFailed,
    ],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    merchantId: row.merchant_id,
    enabled: row.enabled,
    notifyOnPixCreated: row.notify_on_pix_created,
    notifyOnPaymentApproved: row.notify_on_payment_approved,
    notifyOnPixExpiring: row.notify_on_pix_expiring,
    notifyOnSubscriptionFailed: row.notify_on_subscription_failed,
    templatePixCreated: row.template_pix_created,
    templatePaymentApproved: row.template_payment_approved,
    templatePixExpiring: row.template_pix_expiring,
    templateSubscriptionFailed: row.template_subscription_failed,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function dispatchWhatsappNotification(
  database: Database,
  merchantId: string,
  eventType: 'pix_created' | 'payment_approved' | 'pix_expiring' | 'subscription_failed',
  recipientPhone: string,
  variables: Record<string, string>,
  chargeId?: string,
): Promise<{ success: boolean; logId: string; status: string; error?: string }> {
  const normalizedPhone = normalizeWhatsappPhone(recipientPhone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return { success: false, logId: '', status: 'FAILED', error: 'Telefone inválido' };
  }

  const settings = await getMerchantWhatsappSettings(database, merchantId);
  if (!settings.enabled) {
    return { success: false, logId: '', status: 'DISABLED', error: 'Notificações WhatsApp desativadas' };
  }

  let template = '';
  if (eventType === 'pix_created' && settings.notifyOnPixCreated) {
    template = settings.templatePixCreated;
  } else if (eventType === 'payment_approved' && settings.notifyOnPaymentApproved) {
    template = settings.templatePaymentApproved;
  } else if (eventType === 'pix_expiring' && settings.notifyOnPixExpiring) {
    template = settings.templatePixExpiring;
  } else if (eventType === 'subscription_failed' && settings.notifyOnSubscriptionFailed) {
    template = settings.templateSubscriptionFailed;
  } else {
    return { success: false, logId: '', status: 'IGNORED', error: 'Evento não habilitado' };
  }

  const messageBody = interpolateVariables(template, variables);

  const sendResult = await sendViaBridge(normalizedPhone, messageBody);
  const status: 'DELIVERED' | 'QUEUED' | 'FAILED' = sendResult.success ? 'DELIVERED' : 'QUEUED';

  const logResult = await database.query<{ id: string }>(
    `INSERT INTO merchant_whatsapp_logs
       (merchant_id, charge_id, recipient_phone, event_type, message_body, status, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      merchantId,
      chargeId || null,
      normalizedPhone,
      `whatsapp.${eventType}`,
      messageBody,
      status,
      sendResult.error || null,
    ],
  );

  const logId = logResult.rows[0]?.id || crypto.randomUUID();

  return {
    success: sendResult.success,
    logId,
    status,
    error: sendResult.error,
  };
}

export async function sendTestWhatsappNotification(
  database: Database,
  merchantId: string,
  recipientPhone: string,
  eventType: 'pix_created' | 'payment_approved' | 'pix_expiring' | 'subscription_failed',
): Promise<{ success: boolean; logId: string; status: string; messageBody: string; error?: string }> {
  const normalizedPhone = normalizeWhatsappPhone(recipientPhone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    throw new Error('Telefone do destinatário inválido.');
  }

  const settings = await getMerchantWhatsappSettings(database, merchantId);

  let template = '';
  switch (eventType) {
    case 'pix_created':
      template = settings.templatePixCreated;
      break;
    case 'payment_approved':
      template = settings.templatePaymentApproved;
      break;
    case 'pix_expiring':
      template = settings.templatePixExpiring;
      break;
    case 'subscription_failed':
      template = settings.templateSubscriptionFailed;
      break;
  }

  const sampleVariables: Record<string, string> = {
    customer_name: 'Cliente Teste AXION',
    amount: 'R$ 99,00',
    product_title: 'Assinatura Pro (Demonstração)',
    pix_code: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540599.005802BR5913AXION PAY6009SAO PAULO62070503***6304ABCD',
    receipt_url: 'https://pay.axionenterprise.cloud/recibo/test_123',
    checkout_url: 'https://pay.axionenterprise.cloud/p/test_123',
    merchant_name: 'AXION Enterprise',
  };

  const messageBody = interpolateVariables(template, sampleVariables);

  const sendResult = await sendViaBridge(normalizedPhone, messageBody);
  const status: 'DELIVERED' | 'QUEUED' | 'FAILED' = sendResult.success ? 'DELIVERED' : 'QUEUED';

  const logResult = await database.query<{ id: string }>(
    `INSERT INTO merchant_whatsapp_logs
       (merchant_id, charge_id, recipient_phone, event_type, message_body, status, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      merchantId,
      'test_simulation',
      normalizedPhone,
      `whatsapp.test.${eventType}`,
      messageBody,
      status,
      sendResult.error || null,
    ],
  );

  return {
    success: sendResult.success,
    logId: logResult.rows[0]?.id || crypto.randomUUID(),
    status,
    messageBody,
    error: sendResult.error,
  };
}

export async function listMerchantWhatsappLogs(
  database: Database,
  merchantId: string,
  limit = 50,
): Promise<MerchantWhatsappLog[]> {
  const result = await database.query<{
    id: string;
    merchant_id: string;
    charge_id: string | null;
    recipient_phone: string;
    event_type: string;
    message_body: string;
    status: string;
    error: string | null;
    created_at: Date;
  }>(
    `SELECT * FROM merchant_whatsapp_logs
     WHERE merchant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [merchantId, limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    merchantId: row.merchant_id,
    chargeId: row.charge_id,
    recipientPhone: row.recipient_phone,
    eventType: row.event_type,
    messageBody: row.message_body,
    status: row.status as 'QUEUED' | 'DELIVERED' | 'FAILED',
    error: row.error,
    createdAt: row.created_at.toISOString(),
  }));
}
