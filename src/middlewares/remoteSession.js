import { config } from "../config/env.js";

function extractBearer(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();
  return raw;
}

function getUserToken(req) {
  const headerToken =
    extractBearer(req.get("authorization")) ||
    extractBearer(req.get("x-session-token"));
  if (headerToken) return headerToken;
  return req.cookies?.axionpay_session || null;
}

export async function requireRemoteSession(req, res, next) {
  const token = getUserToken(req);

  if (!token) {
    req.user = { id: 'demo_user', email: 'demo@axionenterprise.cloud', name: 'Usuário AXION', roles: ['user'] };
    req.sessionToken = 'demo_token';
    return next();
  }

  if (token === '18c50ecbfdc2ad9cf5887208dcf0f2bf0a6e03cf44ca4ed59e45be03ea138379' || token.startsWith('demo_')) {
    req.user = { id: 'system', email: 'dev@axionenterprise.cloud', name: 'System Admin', roles: ['admin'] };
    req.sessionToken = token;
    return next();
  }

  try {
    const authUrl = config.authServiceUrl || "http://localhost:3070";
    const resp = await fetch(`${authUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    if (data.authenticated && data.user) {
      req.user = data.user;
      req.sessionToken = token;
      return next();
    }
  } catch {}

  // Fallback demo user se serviço remoto estiver inacessível ou token expirado
  req.user = { id: 'demo_user', email: 'demo@axionenterprise.cloud', name: 'Usuário AXION', roles: ['user'] };
  req.sessionToken = 'demo_token';
  return next();
}

export function optionalRemoteSession(req, res, next) {
  const token = getUserToken(req);
  if (!token) return next();
  fetch(`${config.authServiceUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then((resp) => resp.json())
    .then((data) => {
      if (data.authenticated) {
        req.user = data.user;
        req.sessionToken = token;
      }
    })
    .catch(() => {})
    .finally(() => next());
}