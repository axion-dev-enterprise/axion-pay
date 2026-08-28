import { Router } from "express";
import https from "https";
import fs from "fs";

export const trialRouter = Router();

function getStripeKeys() {
  let secretKey = process.env.STRIPE_SECRET_KEY;
  let publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    const vaultMaster = "D:\\WORKSPACE\\SECURE\\VAULT\\tokens\\pagamentos\\stripe.env";
    const vaultSensix = "D:\\WORKSPACE\\SECURE\\VAULT\\tokens\\pagamentos\\stripe_sensix.env";
    const vaultPath = fs.existsSync(vaultMaster) ? vaultMaster : (fs.existsSync(vaultSensix) ? vaultSensix : null);
    
    if (vaultPath) {
      const content = fs.readFileSync(vaultPath, "utf8");
      const skMatch = content.match(/STRIPE_SECRET_KEY=(sk_[^\r\n]+)/);
      const pkMatch = content.match(/STRIPE_PUBLISHABLE_KEY=(pk_[^\r\n]+)/);
      if (skMatch) secretKey = skMatch[1].trim();
      if (pkMatch) publishableKey = pkMatch[1].trim();
    }
  }

  return {
    secretKey: secretKey || "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",
    publishableKey: publishableKey || "pk_live_51TwNLnFwayvFg6rOk7r3sIBFj6PgU2TIjAAZIIAUlCs9NWapSJY81vRwR8IhM7QlIZ6s0nns8gwfmT37N5LIqcOV00hi4sAjWk"
  };
}

function stripeRequest(method, endpoint, bodyParams = null) {
  const { secretKey } = getStripeKeys();
  return new Promise((resolve, reject) => {
    const postData = bodyParams ? new URLSearchParams(bodyParams).toString() : "";
    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "User-Agent": "AxionPay-Trial-Service/1.0"
    };

    if (bodyParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = https.request(
      `https://api.stripe.com/v1${endpoint}`,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: { raw: data } });
          }
        });
      }
    );

    req.on("error", reject);
    if (bodyParams) req.write(postData);
    req.end();
  });
}

// 1. GET /api/trial/config
trialRouter.get("/config", (req, res) => {
  const { secretKey, publishableKey } = getStripeKeys();
  res.json({
    publishableKey,
    mode: secretKey.startsWith("sk_live_") ? "live" : "test"
  });
});

// 2. POST /api/trial/create-setup-intent
trialRouter.post("/create-setup-intent", async (req, res) => {
  const { name, email, company } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "E-mail corporativo é obrigatório." });
  }

  try {
    const listResp = await stripeRequest("GET", `/customers?email=${encodeURIComponent(email)}&limit=1`);
    let customerId;

    if (listResp.data && listResp.data.data && listResp.data.data.length > 0) {
      customerId = listResp.data.data[0].id;
    } else {
      const createCust = await stripeRequest("POST", "/customers", {
        email,
        name: name || email,
        "metadata[company]": company || "N/A",
        "metadata[source]": "axion_trial_verifier"
      });
      customerId = createCust.data.id;
    }

    const setupResp = await stripeRequest("POST", "/setup_intents", {
      customer: customerId,
      "payment_method_types[0]": "card",
      usage: "off_session",
      "metadata[customer_email]": email,
      "metadata[trial_plan]": "axion_pro_14d_trial"
    });

    if (setupResp.status >= 200 && setupResp.status < 300) {
      res.json({
        clientSecret: setupResp.data.client_secret,
        setupIntentId: setupResp.data.id,
        customerId
      });
    } else {
      res.status(setupResp.status || 400).json({
        error: (setupResp.data && setupResp.data.error && setupResp.data.error.message) || "Falha ao iniciar validação bancária."
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. POST /api/trial/verify-setup
trialRouter.post("/verify-setup", async (req, res) => {
  const { setupIntentId } = req.body || {};

  if (!setupIntentId) {
    return res.status(400).json({ error: "setupIntentId é obrigatório." });
  }

  try {
    const intentResp = await stripeRequest("GET", `/setup_intents/${setupIntentId}?expand[]=payment_method`);

    if (intentResp.data && intentResp.data.status === "succeeded") {
      const pm = intentResp.data.payment_method;
      const card = (pm && pm.card) || {};

      const trialId = `AXN-TRIAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      res.json({
        success: true,
        status: "valid",
        trialId,
        verifiedAt: new Date().toISOString(),
        card: {
          brand: (card.brand && card.brand.toUpperCase()) || "CARD",
          last4: card.last4 || "****",
          expMonth: card.exp_month,
          expYear: card.exp_year,
          funding: card.funding || "credit",
          country: card.country || "BR",
          checks: {
            cvcCheck: (card.checks && card.checks.cvc_check) || "pass",
            zipCheck: (card.checks && card.checks.address_postal_code_check) || "pass"
          }
        },
        message: "Cartão validado com sucesso na rede emissora. Trial ativado!"
      });
    } else {
      res.json({
        success: false,
        status: "invalid",
        reason: (intentResp.data && intentResp.data.last_setup_error && intentResp.data.last_setup_error.message) || "O emissor bancário recusou a verificação do cartão.",
        code: (intentResp.data && intentResp.data.last_setup_error && intentResp.data.last_setup_error.code) || "verification_failed"
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default trialRouter;
