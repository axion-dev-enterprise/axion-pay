import { Router } from "express";
import { signupHandler, loginHandler } from "../controllers/supabaseAuthController.js";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    const supabase = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    res.cookie("axion_token", data.session.access_token, {
      httpOnly: false,
      secure: config.env === "production",
      sameSite: config.env === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({ ok: true, token: data.session.access_token, user: data.user });
  } catch (err) {
    return next(err);
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email_and_password_required" });
    }

    const supabase = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, user: data.user, session: data.session || null });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.axion_token || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      const supabase = createClient(config.supabase.url, config.supabase.publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await supabase.auth.signOut(token);
    }
  } catch {}

  res.clearCookie("axion_token", { path: "/" });
  res.clearCookie("axion_session", { path: "/" });
  return res.json({ ok: true });
});

export default router;
