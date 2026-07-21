import { config } from "../config/env.js";
import { findUserByApiKey } from "../models/userStore.js";

export function requireApiKey(req, res, next) {
  if (!config.auth.required) {
    return next();
  }

  if (req.method === "OPTIONS") {
    return next();
  }

  const headerKey = req.get("x-api-key");
  const authorization = req.get("authorization");
  const bearer =
    authorization && authorization.toLowerCase().startsWith("bearer ")
      ? authorization.slice(7).trim()
      : null;
  const token = headerKey || bearer;

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: "API key obrigatoria.",
      code: "unauthorized"
    });
  }

  if (config.auth.apiKey && token === config.auth.apiKey) {
    return next();
  }

  const user = findUserByApiKey(token);
  if (!user) {
    return res.status(403).json({
      ok: false,
      error: "API key invalida.",
      code: "forbidden"
    });
  }

  if (!user.email_verified) {
    return res.status(403).json({
      ok: false,
      error: "Conta sem email confirmado.",
      code: "email_unverified"
    });
  }

  if (user.status !== "approved") {
    return res.status(403).json({
      ok: false,
      error: "Conta nao aprovada para uso.",
      code: "account_not_approved"
    });
  }

  req.apiUser = user;
  return next();
}
