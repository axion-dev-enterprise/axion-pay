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
import accountRoutes from "./routes/account.js";
import payTagsRoutes from "./routes/payTags.js";
import dashboardRoutes from "./routes/dashboard.js";
import documentsRoutes from "./routes/documents.js";
import checkoutRoutes from "./routes/checkout.js";
import cardTokensRoutes from "./routes/cardTokens.js";
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
        connectSrc: config.csp?.connectSrc || ["'self'"]
      }
    }
  })
);
const corsOptions = {
  credentials: config.cors.credentials,
  origin:
    config.cors.origins === "*"
      ? (requestOrigin, callback) => callback(null, true)
      : config.cors.origins
};

app.use(cors(corsOptions));
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

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "UP",
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    uptime: Number(process.uptime().toFixed(3)),
    env: config.env
  });
});

app.use("/auth", authRoutes);
app.use("/signup", signupRoutes);
app.use("/account", accountRoutes);
app.use("/account/pay-tags", payTagsRoutes);
app.use("/account/card-tokens", cardTokensRoutes);
app.use("/payments", requireApiKey, paymentRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/admin", adminRoutes);
app.use("/api/dashboard/documents", documentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/checkout", checkoutRoutes);

// Expose OpenAPI spec file (docs content is kept in-repo, but the SPA handles /docs route).
app.get("/openapi.yaml", (_req, res) => res.sendFile(path.join(docsDir, "openapi.yaml")));

// API 404s should stay JSON (don't fall through to SPA)
app.use("/api", notFoundHandler);

app.use(express.static(spaDir));
app.get("*", (_req, res) => res.sendFile(path.join(spaDir, "index.html")));

app.use(notFoundHandler);
app.use(errorHandler);
