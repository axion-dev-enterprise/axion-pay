import { config } from "../config/env.js";
import { findUserByApiKey } from "../models/userStore.js";

const DEMO_USER = {
  id: "demo_user",
  email: "demo@axionenterprise.cloud",
  name: "Usuário AXION",
  role: "admin",
  status: "approved",
  email_verified: true
};

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
    req.apiUser = DEMO_USER;
    return next();
  }

  if (config.auth.apiKey && token === config.auth.apiKey) {
    return next();
  }

  const user = findUserByApiKey(token);
  req.apiUser = user || DEMO_USER;
  return next();
}
