import { app } from "../src/app.js";
import { ensureAdminUser } from "../src/services/adminUserService.js";

try {
  ensureAdminUser();
} catch (err) {
  console.error("Failed to ensure admin user on Vercel initialization:", err);
}

export default function handler(req, res) {
  return app(req, res);
}
