import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { config } from "./config/env.js";
import paymentRoutes from "./routes/payments.js";
import webhookRoutes from "./routes/webhooks.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import signupRoutes from "./routes/signup.js";
import { signupHandler, loginHandler } from "./controllers/supabaseAuthController.js";
import { requireSupabaseAuth } from "./middlewares/supabaseAuth.js";
import supabaseAuthRoutes from "./routes/supabaseAuth.js";
import accountRoutes from "./routes/account.js";
import payTagsRoutes from "./routes/payTags.js";
import dashboardRoutes from "./routes/dashboard.js";
import documentsRoutes from "./routes/documents.js";
import checkoutRoutes from "./routes/checkout.js";
import cardTokensRoutes from "./routes/cardTokens.js";
import payApiRoutes from "./routes/payApi.js";
import flowApiRoutes from "./routes/flowApi.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import cryptoOnrampRoutes from "./routes/cryptoOnramp.js";
import { requireApiKey } from "./middlewares/auth.js";
import { errorHandler, notFoundHandler } from "./middlewares/errors.js";

export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const spaDir = path.join(__dirname, "..", "dist");
const docsDir = path.join(__dirname, "..", "docs");

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.use((req, res, next) => {
  const incomingId = req.get("x-request-id");
  const requestId = incomingId && incomingId.trim() ? incomingId.trim() : randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
        connectSrc: ["'self'", "https://auth.axionenterprise.cloud"].concat(config.csp?.connectSrc || [])
      }
    }
  })
);
const corsOptions = {
  credentials: true,
  origin: (requestOrigin, callback) => callback(null, requestOrigin || true),
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id", "Accept", "Origin", "X-Api-Key", "X-Tenant-ID"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req, res, next) => {
  req.tenantId = req.headers["x-tenant-id"] || req.headers["X-Tenant-ID"] || "default";
  next();
});

app.use(
  express.json({
    limit: config.jsonBodyLimit,
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    }
  })
);

app.use((req, res, next) => {
  if (config.rateLimit?.max) {
    res.setHeader("X-RateLimit-Limit", config.rateLimit.max);
    res.setHeader("X-RateLimit-WindowMs", config.rateLimit.windowMs);
  }
  res.setHeader("X-App-Name", "AxionPAY");
  next();
});

app.use(cookieParser());

if (config.rateLimit?.max) {
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max
    })
  );
}

app.get(["/health", "/api/health", "/api/pay/health"], (req, res) => {
  res.json({
    ok: true,
    status: "ok",
    service: "axion-pay",
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    uptime: Number(process.uptime().toFixed(3)),
    env: config.env
  });
});

app.get("/api/auth/me", (req, res) => {
  res.json({
    authenticated: true,
    user: { id: "demo_user", email: "dev@axionenterprise.cloud", name: "Usuário AXION", roles: ["user", "admin"] }
  });
});
// All API routes mounted UNDER /api/ (Vercel only routes /api/(.*) to the serverless function).
// Non-API paths (/checkout, /flow, /auth, etc.) are served as SPA by Vercel directly.
app.use("/api/auth", flowApiRoutes);
app.use("/api/auth/pay", authRoutes);
app.use("/api/signup", signupRoutes);
app.use("/api/auth/supabase", supabaseAuthRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/account/pay-tags", payTagsRoutes);
app.use("/api/account/card-tokens", cardTokensRoutes);
app.use("/api/payments", requireApiKey, paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard/documents", documentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/v1/onramp", cryptoOnrampRoutes);
app.use("/api/onramp", cryptoOnrampRoutes);
app.use("/api/pay", payApiRoutes);
app.use("/api/flow", flowApiRoutes);

// Expose OpenAPI spec file (docs content is kept in-repo, but the SPA handles /docs route).
app.get("/openapi.yaml", (_req, res) => res.sendFile(path.join(docsDir, "openapi.yaml")));

// API 404s should stay JSON (don't fall through to SPA)
app.use("/api", notFoundHandler);

app.use(express.static(spaDir));
app.use((_req, res) => {
  res.sendFile(path.join(spaDir, "index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);
