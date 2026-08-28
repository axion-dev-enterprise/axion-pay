import { config } from "../config/env.js";

export async function requireSupabaseAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookie = req.cookies?.axion_token || req.cookies?.axion_session;
  const token = bearer || cookie;

  if (!token) {
    return res.status(401).json({ ok: false, error: "missing_session" });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "invalid_session" });
    }

    req.supabaseUser = data.user;
    req.supabase = supabase;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "invalid_session" });
  }
}
