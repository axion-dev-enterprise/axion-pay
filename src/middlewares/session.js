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

export function requireUserSession(req, res, next) {
  const token = getUserToken(req);
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "Sessao necessaria.",
      code: "unauthorized"
    });
  }
  const user = getSessionByToken(token);
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: "Sessao invalida ou expirada.",
      code: "unauthorized"
    });
  }
  req.user = user;
  req.sessionToken = token;
  return next();
}

export function requireAdminSession(req, res, next) {
  const token = getAdminToken(req);
  if (token) {
    const session = getAdminSession(token);
    if (!session) {
      return res.status(401).json({
        ok: false,
        error: "Sessao admin invalida ou expirada.",
        code: "unauthorized"
      });
    }
    req.adminToken = token;
    return next();
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

  return res.status(401).json({
    ok: false,
    error: "Sessao admin necessaria.",
    code: "unauthorized"
  });
}
