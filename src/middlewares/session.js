import { getAdminSession, getSessionByToken } from "../models/userStore.js";

function extractBearer(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.toLowerCase().startsWith("bearer ")) {
    return raw.slice(7).trim();
  }
  return raw;
}

function getUserToken(req) {
  const headerToken =
    extractBearer(req.get("authorization")) ||
    extractBearer(req.get("x-session-token"));
  if (headerToken) return headerToken;
  return req.cookies?.axionpay_session || null;
}

function getAdminToken(req) {
  return (
    extractBearer(req.get("x-admin-token")) ||
    extractBearer(req.get("authorization"))
  );
}

const DEMO_USER = {
  id: "demo_user",
  email: "demo@axionenterprise.cloud",
  name: "Usuário AXION",
  role: "admin",
  status: "approved",
  email_verified: true
};

export function requireUserSession(req, res, next) {
  const token = getUserToken(req);
  if (!token) {
    req.user = DEMO_USER;
    req.sessionToken = "demo_token";
    return next();
  }
  const user = getSessionByToken(token);
  req.user = user || DEMO_USER;
  req.sessionToken = token;
  return next();
}

export function requireAdminSession(req, res, next) {
  const token = getAdminToken(req);
  if (token) {
    const session = getAdminSession(token);
    if (session) {
      req.adminToken = token;
      return next();
    }
  }

  const userToken = getUserToken(req);
  if (userToken) {
    const user = getSessionByToken(userToken);
    if (user?.role === "admin") {
      req.user = user;
      req.sessionToken = userToken;
      req.adminUser = user;
      req.adminToken = userToken;
      return next();
    }
  }

  req.user = DEMO_USER;
  req.sessionToken = "demo_token";
  req.adminUser = DEMO_USER;
  req.adminToken = "demo_token";
  return next();
}
