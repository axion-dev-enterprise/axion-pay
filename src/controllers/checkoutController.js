import { AppError } from "../utils/errors.js";
import {
  createCheckoutProduct,
  listCheckoutProductsByUser,
  updateCheckoutProduct,
  deleteCheckoutProduct,
  findCheckoutProductBySlug,
  findCheckoutProductById,
  findCheckoutProductByUserAndSlug
} from "../models/checkoutStore.js";
import { findPayTagById } from "../models/payTagsStore.js";
import { isPlainObject } from "../utils/validation.js";

const ALLOWED_TEMPLATES = new Set(["classic", "premium"]);

function normalizeTemplate(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ALLOWED_TEMPLATES.has(normalized) ? normalized : "classic";
}

function normalizeHexColor(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(text)) {
    const [r, g, b] = text.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function sanitizeAppearance(value) {
  if (!value) return null;
  if (!isPlainObject(value)) {
    throw new AppError("appearance deve ser um objeto.", 400, "invalid_request");
  }

  const primary = normalizeHexColor(value.primary);
  const accent = normalizeHexColor(value.accent);
  const background = normalizeHexColor(value.background);
  const surface = normalizeHexColor(value.surface);
  const text = normalizeHexColor(value.text);
  const muted = normalizeHexColor(value.muted);

  const logoUrl = value.logoUrl ? String(value.logoUrl).trim() : "";
  const brandName = value.brandName ? String(value.brandName).trim() : "";
  const fontFamily = value.fontFamily ? String(value.fontFamily).trim() : "";
  const radius = Number.isFinite(Number(value.radius)) ? Number(value.radius) : undefined;
  const buttonRadius = Number.isFinite(Number(value.buttonRadius))
    ? Number(value.buttonRadius)
    : undefined;

  const customCss = value.customCss ? String(value.customCss) : "";
  if (customCss && customCss.length > 8000) {
    throw new AppError("customCss muito grande (max 8000 caracteres).", 400, "invalid_request");
  }

  const out = {
    ...(brandName ? { brandName } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(primary ? { primary } : {}),
    ...(accent ? { accent } : {}),
    ...(background ? { background } : {}),
    ...(surface ? { surface } : {}),
    ...(text ? { text } : {}),
    ...(muted ? { muted } : {}),
    ...(Number.isFinite(radius) ? { radius: Math.max(0, Math.min(radius, 28)) } : {}),
    ...(Number.isFinite(buttonRadius)
      ? { buttonRadius: Math.max(0, Math.min(buttonRadius, 28)) }
      : {}),
    ...(customCss ? { customCss } : {})
  };

  return Object.keys(out).length ? out : null;
}

function sanitizePaymentConfig(value) {
  if (!value) return null;
  if (!isPlainObject(value)) {
    throw new AppError("paymentConfig deve ser um objeto.", 400, "invalid_request");
  }

  const requiredFields = Array.isArray(value.requiredFields)
    ? value.requiredFields.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
    : undefined;

  const allowedMethods = Array.isArray(value.allowedMethods)
    ? value.allowedMethods
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => item === "pix" || item === "card")
        .slice(0, 2)
    : undefined;

  const maxInstallments = value.maxInstallments !== undefined ? Number(value.maxInstallments) : undefined;
  const riskLevel = value.riskLevel ? String(value.riskLevel).trim().toLowerCase() : undefined;
  const callbackUrl = value.callbackUrl ? String(value.callbackUrl).trim() : undefined;
  const internalNotes = value.internalNotes ? String(value.internalNotes).trim().slice(0, 2000) : undefined;

  const out = {
    ...(requiredFields ? { requiredFields } : {}),
    ...(allowedMethods ? { allowedMethods } : {}),
    ...(value.allowSplit !== undefined ? { allowSplit: Boolean(value.allowSplit) } : {}),
    ...(value.allowPartialRefund !== undefined
      ? { allowPartialRefund: Boolean(value.allowPartialRefund) }
      : {}),
    ...(value.enableThreeDS !== undefined ? { enableThreeDS: Boolean(value.enableThreeDS) } : {}),
    ...(Number.isFinite(maxInstallments)
      ? { maxInstallments: Math.max(1, Math.min(maxInstallments, 24)) }
      : {}),
    ...(callbackUrl ? { callbackUrl } : {}),
    ...(riskLevel ? { riskLevel } : {}),
    ...(internalNotes ? { internalNotes } : {})
  };

  return Object.keys(out).length ? out : null;
}

function parseFeatures(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim());
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSocialProof(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, valuePart, caption] = line
        .split("|")
        .map((item) => String(item || "").trim());
      return {
        label: label || "Case",
        value: valuePart || "-",
        caption: caption || ""
      };
    });
}

function ensurePrice(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError("Preco invalido.", 400, "invalid_price");
  }
  return parsed;
}

export function listProductsHandler(req, res) {
  const userId = req.user.id;
  const products = listCheckoutProductsByUser(userId).map((product) => {
    if (!product?.payTagId) return product;
    const payTag = findPayTagById(product.payTagId);
    return payTag ? { ...product, payTag, pay_tag: payTag } : product;
  });
  return res.json({ ok: true, products });
}

export function createProductHandler(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      slug,
      title,
      description,
      price,
      currency = "BRL",
      theme = "black",
      template = "classic",
      payTagId,
      pay_tag_id,
      appearance,
      paymentConfig,
      features,
      socialProof
    } = req.body || {};

    if (!slug || !title || !description) {
      throw new AppError("Campos obrigatorios ausentes.", 400, "invalid_request");
    }

    const normalizedTheme = theme === "white" ? "white" : "black";
    const parsedPrice = ensurePrice(price ?? 0);
    const existing = findCheckoutProductByUserAndSlug(req.user.id, slug);
    if (existing) {
      throw new AppError("Slug ja registrado.", 409, "slug_conflict");
    }

    const resolvedPayTagId = payTagId || pay_tag_id || null;
    if (!resolvedPayTagId) {
      throw new AppError("Pay-tag obrigatoria.", 400, "invalid_request");
    }
    const payTag = findPayTagById(resolvedPayTagId);
    if (!payTag) {
      throw new AppError("Pay-tag invalida.", 400, "invalid_request");
    }

    const product = createCheckoutProduct({
      userId,
      payTagId: resolvedPayTagId,
      slug,
      title: String(title).trim(),
      description: String(description).trim(),
      price: parsedPrice,
      currency: String(currency || "BRL").trim().toUpperCase(),
      theme: normalizedTheme,
      template: normalizeTemplate(template),
      appearance: sanitizeAppearance(appearance),
      paymentConfig: sanitizePaymentConfig(paymentConfig),
      features: parseFeatures(features),
      socialProof: parseSocialProof(socialProof)
    });

    return res.status(201).json({ ok: true, product: { ...product, payTag, pay_tag: payTag } });
  } catch (err) {
    return next(err);
  }
}

export function updateProductHandler(req, res, next) {
  try {
    const { id } = req.params;
    const patch = req.body || {};

    if (!id) {
      throw new AppError("ID obrigatorio.", 400, "invalid_request");
    }

    if (patch.price !== undefined) {
      patch.price = ensurePrice(patch.price);
    }
    if (patch.theme) {
      patch.theme = patch.theme === "white" ? "white" : "black";
    }
    if (patch.template !== undefined) {
      patch.template = normalizeTemplate(patch.template);
    }

    if (patch.payTagId !== undefined || patch.pay_tag_id !== undefined) {
      const resolvedPayTagId = patch.payTagId || patch.pay_tag_id || null;
      if (!resolvedPayTagId) {
        throw new AppError("Pay-tag invalida.", 400, "invalid_request");
      }
      const payTag = findPayTagById(resolvedPayTagId);
      if (!payTag) {
        throw new AppError("Pay-tag invalida.", 400, "invalid_request");
      }
      patch.pay_tag_id = resolvedPayTagId;
      delete patch.payTagId;
    }

    if (patch.appearance !== undefined) {
      patch.appearance = sanitizeAppearance(patch.appearance);
    }

    if (patch.paymentConfig !== undefined) {
      patch.payment_config = sanitizePaymentConfig(patch.paymentConfig);
      delete patch.paymentConfig;
    }

    if (patch.payment_config !== undefined) {
      patch.payment_config = sanitizePaymentConfig(patch.payment_config);
    }

    if (patch.features) {
      patch.features = parseFeatures(patch.features);
    }
    if (patch.socialProof) {
      patch.social_proof = parseSocialProof(patch.socialProof);
      delete patch.socialProof;
    }
    if (patch.social_proof) {
      patch.social_proof = parseSocialProof(patch.social_proof);
    }

    const existing = findCheckoutProductById(id);
    if (!existing) {
      throw new AppError("Produto nao encontrado.", 404, "not_found");
    }
    if (String(existing.userId) !== String(req.user.id)) {
      throw new AppError("Nao autorizado.", 403, "forbidden");
    }

    const product = updateCheckoutProduct(id, patch);
    const payTag = product?.payTagId ? findPayTagById(product.payTagId) : null;
    return res.json({
      ok: true,
      product: payTag ? { ...product, payTag, pay_tag: payTag } : product
    });
  } catch (err) {
    return next(err);
  }
}

export function deleteProductHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("ID obrigatorio.", 400, "invalid_request");
    }
    const existing = findCheckoutProductById(id);
    if (!existing || String(existing.userId) !== String(req.user.id)) {
      throw new AppError("Produto nao encontrado.", 404, "not_found");
    }
    const deleted = deleteCheckoutProduct(id);
    if (!deleted) {
      throw new AppError("Produto nao encontrado.", 404, "not_found");
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export function getProductBySlugHandler(req, res) {
  const { slug } = req.params;
  const product = findCheckoutProductBySlug(slug);
  if (!product) {
    return res.status(404).json({ ok: false, error: "Checkout nao encontrado.", code: "not_found" });
  }
  const payTag = product?.payTagId ? findPayTagById(product.payTagId) : null;
  return res.json({ ok: true, product: payTag ? { ...product, payTag, pay_tag: payTag } : product });
}

