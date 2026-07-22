import { app } from "../src/app.js";
import { ensureAdminUser } from "../src/services/adminUserService.js";

try {
  ensureAdminUser();
} catch (err) {
  console.error("Failed to ensure admin user on Vercel initialization:", err);
}

export default function handler(req, res) {
  const originalUrl = req.headers["x-matched-path"] || req.headers["x-invoke-path"];
  if (originalUrl) {
    req.url = originalUrl;
  }
  return app(req, res);
}
