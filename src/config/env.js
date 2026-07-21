import dotenv from "dotenv";
import os from "os";
import path from "path";

dotenv.config();

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = process.env.NODE_ENV || "development";
const testPixOverride = process.env.TEST_DEFAULT_PIX_PROVIDER;
const testCardOverride = process.env.TEST_DEFAULT_CARD_PROVIDER;
const defaultPixProvider =
  env === "test"
    ? testPixOverride || "mock"
    : process.env.DEFAULT_PIX_PROVIDER || "mercadopago";
const defaultCardProvider =
  env === "test"
    ? testCardOverride || "mock"
    : process.env.DEFAULT_CARD_PROVIDER || "mercadopago";
const providersConfig = {
  defaultPix: defaultPixProvider,
  defaultCard: defaultCardProvider
};
const DEFAULT_DEV_CORS_ORIGINS = "*";
const DEFAULT_PROD_CORS_ORIGINS = [
  "https://pay.axionenterprise.cloud",
  "https://api.axionpay.cloud"
];
const DEFAULT_CSP_CONNECT_SRC = [
  "'self'",
  "https://pay.axionenterprise.cloud",
  "https://api.axionpay.cloud",
  "http://localhost:3060",
  "http://localhost:5173"
];
const DEFAULT_ALLOW_ALL_ORIGINS = true;
const forceAllowAllOrigins = parseBoolean(process.env.ALLOW_ALL_CORS, DEFAULT_ALLOW_ALL_ORIGINS);
const mercadopagoPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY || "";
const serverRoot = path.resolve(process.cwd(), "..");
const defaultAppRoot = process.env.VERCEL
  ? os.tmpdir()
  : process.env.APPDATA ||
    process.env.XDG_DATA_HOME ||
    path.join(serverRoot, "appdata", "roaming");
const storageRoot = process.env.STORAGE_ROOT || path.join(defaultAppRoot, "axion-pay");
const storageFile = process.env.STORAGE_FILE || "store.json";
const storagePath = path.resolve(storageRoot, storageFile);

const corsOriginsConfig = (() => {
  if (forceAllowAllOrigins) return "*";
  const raw = process.env.CORS_ORIGINS?.trim() || "";
  if (raw === "*") return "*";
  if (raw.length > 0) return parseCsv(raw);
  if (env === "development") return DEFAULT_DEV_CORS_ORIGINS;
  return DEFAULT_PROD_CORS_ORIGINS;
})();
const cspConnectCandidates = (() => {
  if (forceAllowAllOrigins) return ["*"];
  const raw = process.env.CSP_CONNECT_SRC?.trim() || "";
  const extras = parseCsv(raw);
  const candidates = [
    ...DEFAULT_CSP_CONNECT_SRC,
    ...extras
  ];
  return Array.from(new Set(candidates));
})();
const cspConnectSrc = Array.from(new Set(cspConnectCandidates));
const corsCredentials =
  process.env.CORS_CREDENTIALS !== undefined
    ? parseBoolean(process.env.CORS_CREDENTIALS, true)
    : corsOriginsConfig === "*"
    ? true
    : env === "development";

const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@pay.axionenterprise.cloud";
const adminUserPassword =
  process.env.ADMIN_USER_PASSWORD || process.env.ADMIN_PASSWORD || "AxionPay$Admin2026!";

export const config = {
  env,
  port: parseNumber(process.env.PORT, 3060),
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  dbPath: process.env.DB_PATH || "data/payment.db",
  storage: {
    root: storageRoot,
    dataFile: storagePath
  },
  uploadsPath: process.env.UPLOADS_PATH || "data/uploads",
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "1mb",
  auth: {
    required: parseBoolean(process.env.AUTH_REQUIRED, false),
    apiKey: process.env.API_KEY || ""
  },
  sessions: {
    ttlDays: parseNumber(process.env.SESSION_TTL_DAYS, 7),
    adminTtlDays: parseNumber(process.env.ADMIN_SESSION_TTL_DAYS, 1)
  },
  admin: {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "123",
    email: adminEmail,
    userPassword: adminUserPassword
  },
  cors: {
    origins: corsOriginsConfig,
    credentials: corsCredentials
  },
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 300)
  },
  payout: {
    minAccountAgeMs: parseNumber(process.env.MIN_PAYOUT_ACCOUNT_AGE_MS, 48 * 60 * 60 * 1000),
    // Fee defaults match the current dashboard UI matrix (fixed + variable).
    // Values are stored in cents/bps to avoid float rounding issues.
    fees: {
      pix: {
        fixedCents: parseNumber(process.env.PAYOUT_FEE_PIX_FIXED_CENTS, 100),
        percentBps: parseNumber(process.env.PAYOUT_FEE_PIX_PERCENT_BPS, 50) // 0.50%
      },
      card: {
        fixedCents: parseNumber(process.env.PAYOUT_FEE_CARD_FIXED_CENTS, 100),
        percentBps: parseNumber(process.env.PAYOUT_FEE_CARD_PERCENT_BPS, 500) // 5.00%
      }
    }
  },
  csp: {
    connectSrc: cspConnectSrc
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    pretty: parseBoolean(process.env.LOG_PRETTY, false),
    wooviLogPath: process.env.WOOVI_LOG_PATH || "logs/woovi-log.jsonl"
  },
  email: {
    from: process.env.EMAIL_FROM || "no-reply@axionpay.local",
    confirmBaseUrl: process.env.EMAIL_CONFIRM_BASE_URL || "http://localhost:3060",
    docsUrl: process.env.DOCS_URL || "http://localhost:3060/home",
    outboxPath: process.env.EMAIL_OUTBOX_PATH || "logs/email-outbox.jsonl",
    smtp: {
      host: process.env.SMTP_HOST || "",
      port: parseNumber(process.env.SMTP_PORT, 0),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      secure: parseBoolean(process.env.SMTP_SECURE, false)
    }
  },
  pix: {
    key: process.env.PIX_KEY || "",
    merchantName: process.env.PIX_MERCHANT_NAME || "",
    merchantCity: process.env.PIX_MERCHANT_CITY || "",
    description: process.env.PIX_DESCRIPTION || "",
    txid: process.env.PIX_TXID || "***"
  },
  woovi: {
    apiKey: process.env.WOOVI_API_KEY || "",
    baseUrl: process.env.WOOVI_BASE_URL || "https://api.woovi-sandbox.com",
    authHeader: process.env.WOOVI_AUTH_HEADER || "",
    pixPath: process.env.WOOVI_PIX_PATH || "/api/v1/charge",
    cardPath: process.env.WOOVI_CARD_PATH || "",
    pixConfirmPath: process.env.WOOVI_PIX_CONFIRM_PATH || "",
    timeoutMs: parseNumber(process.env.WOOVI_TIMEOUT_MS, 10000)
  },
  pagarme: {
    apiKey: process.env.PAGARME_API_KEY || "",
    baseURL: process.env.PAGARME_BASE_URL || "https://api.pagar.me/1"
  },
  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
    baseURL: process.env.MERCADOPAGO_BASE_URL || "https://api.mercadopago.com",
    publicKey: mercadopagoPublicKey
  },
  bancoCentral: {
    pixKey: process.env.BC_PIX_KEY || "2e902cce-70ff-43d9-818c-2b41983b2f6c",
    merchantName: process.env.BC_MERCHANT_NAME || "",
    merchantCity: process.env.BC_MERCHANT_CITY || "",
    merchantCode: process.env.BC_MERCHANT_CODE || ""
  },
  webhooks: {
    pixSecret: process.env.PIX_WEBHOOK_SECRET || "",
    wooviSecret: process.env.WOOVI_WEBHOOK_SECRET || "",
    pagarmeSecret: process.env.PAGARME_WEBHOOK_SECRET || "",
    mercadopagoSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || "",
    requireTimestamp: parseBoolean(process.env.WEBHOOK_REQUIRE_TIMESTAMP, false),
    toleranceSeconds: parseNumber(process.env.WEBHOOK_TOLERANCE_SECONDS, 300)
  },
  providers: providersConfig,
  card: {
    defaultProvider: process.env.CARD_PROVIDER || providersConfig.defaultCard
  },
  database: {
    driver: "sql.js"
  }
};
