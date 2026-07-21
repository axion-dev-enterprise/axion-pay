import { config } from "../config/env.js";

export function requireAdminPermission(req, res, next) {
  const email = config.admin.email?.toLowerCase();
  const userEmail = req.user?.email?.toLowerCase();
  if (!userEmail || userEmail !== email) {
    return res.status(403).json({
      ok: false,
      error: "Permissão administrativa necessária.",
      code: "forbidden"
    });
  }
  return next();
}
