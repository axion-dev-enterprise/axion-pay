import { randomUUID } from "node:crypto";
import { findOne, insertOne, updateOne } from "./jsonStore.js";

const DEFAULT_INTEGRATIONS = {
  services: [
    {
      id: "whatsapp",
      name: "WhatsApp Cloud API",
      enabled: false,
      status: "disconnected",
      endpoint: "",
      apiKey: "",
      notes: "Notificacoes transacionais e suporte."
    },
    {
      id: "mercadopago",
      name: "Mercado Pago",
      enabled: false,
      status: "disconnected",
      endpoint: "",
      apiKey: "",
      notes: "Fallback de processamento em cartao e PIX."
    },
    {
      id: "woovi",
      name: "Woovi",
      enabled: false,
      status: "disconnected",
      endpoint: "",
      apiKey: "",
      notes: "Operacao de cobranca e roteamento."
    },
    {
      id: "google-analytics",
      name: "Google Analytics",
      enabled: false,
      status: "disconnected",
      endpoint: "",
      apiKey: "",
      notes: "Eventos de checkout e funil de conversao."
    }
  ],
  updatedAt: null
};

const DEFAULT_CHECKOUT_PRO = {
  brandName: "Minha marca",
  heroTitle: "Pague com seguranca em segundos",
  heroSubtitle: "Checkout otimizado para aumentar conversao.",
  primaryColor: "#3f9a6c",
  accentColor: "#f6c66e",
  surfaceTone: "glass",
  highlightPix: true,
  showCountdown: true,
  testimonialText: "Mais de 2.000 clientes concluindo pagamentos diariamente.",
  footerMessage: "Pagamento seguro com criptografia ponta a ponta.",
  updatedAt: null
};

function clone(value) {
  return structuredClone(value);
}

export function getUserIntegrations(userId) {
  const record = findOne("dashboardIntegrations", (entry) => entry.user_id === userId);
  if (!record) {
    return clone(DEFAULT_INTEGRATIONS);
  }
  return {
    services: Array.isArray(record.services) ? clone(record.services) : clone(DEFAULT_INTEGRATIONS.services),
    updatedAt: record.updated_at || null
  };
}

export function saveUserIntegrations(userId, payload) {
  const now = new Date().toISOString();
  const existing = findOne("dashboardIntegrations", (entry) => entry.user_id === userId);
  const services = Array.isArray(payload?.services) ? payload.services : [];
  const sanitizedServices = services.map((service) => ({
    id: String(service?.id || randomUUID()),
    name: String(service?.name || "Servico externo"),
    enabled: Boolean(service?.enabled),
    status: String(service?.status || "disconnected"),
    endpoint: String(service?.endpoint || "").trim(),
    apiKey: String(service?.apiKey || "").trim(),
    notes: String(service?.notes || "").trim()
  }));

  if (!existing) {
    insertOne("dashboardIntegrations", {
      id: randomUUID(),
      user_id: userId,
      services: sanitizedServices,
      created_at: now,
      updated_at: now
    });
  } else {
    updateOne(
      "dashboardIntegrations",
      (entry) => entry.user_id === userId,
      {
        services: sanitizedServices,
        updated_at: now
      }
    );
  }

  return {
    services: clone(sanitizedServices),
    updatedAt: now
  };
}

export function getUserCheckoutProConfig(userId) {
  const record = findOne("dashboardCheckoutProConfigs", (entry) => entry.user_id === userId);
  if (!record) {
    return clone(DEFAULT_CHECKOUT_PRO);
  }

  return {
    brandName: String(record.brand_name || DEFAULT_CHECKOUT_PRO.brandName),
    heroTitle: String(record.hero_title || DEFAULT_CHECKOUT_PRO.heroTitle),
    heroSubtitle: String(record.hero_subtitle || DEFAULT_CHECKOUT_PRO.heroSubtitle),
    primaryColor: String(record.primary_color || DEFAULT_CHECKOUT_PRO.primaryColor),
    accentColor: String(record.accent_color || DEFAULT_CHECKOUT_PRO.accentColor),
    surfaceTone: String(record.surface_tone || DEFAULT_CHECKOUT_PRO.surfaceTone),
    highlightPix: Boolean(record.highlight_pix),
    showCountdown: Boolean(record.show_countdown),
    testimonialText: String(record.testimonial_text || DEFAULT_CHECKOUT_PRO.testimonialText),
    footerMessage: String(record.footer_message || DEFAULT_CHECKOUT_PRO.footerMessage),
    updatedAt: record.updated_at || null
  };
}

export function saveUserCheckoutProConfig(userId, payload) {
  const now = new Date().toISOString();
  const existing = findOne("dashboardCheckoutProConfigs", (entry) => entry.user_id === userId);

  const normalized = {
    brand_name: String(payload?.brandName || "").trim() || DEFAULT_CHECKOUT_PRO.brandName,
    hero_title: String(payload?.heroTitle || "").trim() || DEFAULT_CHECKOUT_PRO.heroTitle,
    hero_subtitle: String(payload?.heroSubtitle || "").trim() || DEFAULT_CHECKOUT_PRO.heroSubtitle,
    primary_color: String(payload?.primaryColor || "").trim() || DEFAULT_CHECKOUT_PRO.primaryColor,
    accent_color: String(payload?.accentColor || "").trim() || DEFAULT_CHECKOUT_PRO.accentColor,
    surface_tone: String(payload?.surfaceTone || "").trim() || DEFAULT_CHECKOUT_PRO.surfaceTone,
    highlight_pix: payload?.highlightPix !== undefined ? Boolean(payload.highlightPix) : DEFAULT_CHECKOUT_PRO.highlightPix,
    show_countdown: payload?.showCountdown !== undefined ? Boolean(payload.showCountdown) : DEFAULT_CHECKOUT_PRO.showCountdown,
    testimonial_text: String(payload?.testimonialText || "").trim() || DEFAULT_CHECKOUT_PRO.testimonialText,
    footer_message: String(payload?.footerMessage || "").trim() || DEFAULT_CHECKOUT_PRO.footerMessage,
    updated_at: now
  };

  if (!existing) {
    insertOne("dashboardCheckoutProConfigs", {
      id: randomUUID(),
      user_id: userId,
      ...normalized,
      created_at: now
    });
  } else {
    updateOne("dashboardCheckoutProConfigs", (entry) => entry.user_id === userId, normalized);
  }

  return {
    brandName: normalized.brand_name,
    heroTitle: normalized.hero_title,
    heroSubtitle: normalized.hero_subtitle,
    primaryColor: normalized.primary_color,
    accentColor: normalized.accent_color,
    surfaceTone: normalized.surface_tone,
    highlightPix: normalized.highlight_pix,
    showCountdown: normalized.show_countdown,
    testimonialText: normalized.testimonial_text,
    footerMessage: normalized.footer_message,
    updatedAt: now
  };
}
