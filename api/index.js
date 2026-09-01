import https from 'https';

const PAY_API = "https://api.axionenterprise.cloud";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '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';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_live_51TwNLnFwayvFg6rOk7r3sIBFj6PgU2TIjAAZIIAUlCs9NWapSJY81vRwR8IhM7QlIZ6s0nns8gwfmT37N5LIqcOV00hi4sAjWk';

function stripeRequest(method, endpoint, bodyParams = null) {
  return new Promise((resolve, reject) => {
    const postData = bodyParams ? new URLSearchParams(bodyParams).toString() : '';
    const headers = {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'User-Agent': 'AXION-Pay-Vercel/1.0',
    };

    if (bodyParams) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(`https://api.stripe.com/v1${endpoint}`, {
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    if (bodyParams) req.write(postData);
    req.end();
  });
}

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch(e) { return {}; }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString('utf-8')); } catch(e) { return {}; }
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    // Fallback timeout se o stream já tiver sido encerrado pela Vercel
    setTimeout(() => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        resolve({});
      }
    }, 200);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = req.url || '';

  // 1. Trial Config
  if (url.includes('/api/trial/config') || url.includes('/trial/config')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      publishableKey: STRIPE_PUBLISHABLE_KEY,
      mode: STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test'
    }));
    return;
  }

  // 2. Create Setup Intent
  if (url.includes('/api/trial/create-setup-intent') || url.includes('/trial/create-setup-intent')) {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { name, email, company } = body || {};

      if (!email) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'E-mail corporativo é obrigatório.' }));
        return;
      }

      // Procura ou cria Customer
      const searchRes = await stripeRequest('GET', `/customers?email=${encodeURIComponent(email)}&limit=1`);
      let customerId;

      if (searchRes.data?.data && searchRes.data.data.length > 0) {
        customerId = searchRes.data.data[0].id;
      } else {
        const custParams = {
          email,
          name: name || email,
          'metadata[company]': company || '',
          'metadata[source]': 'AXION_TRIAL_AUDIT',
        };
        const newCust = await stripeRequest('POST', '/customers', custParams);
        if (newCust.data?.id) {
          customerId = newCust.data.id;
        } else {
          throw new Error(newCust.data?.error?.message || 'Falha ao registrar cliente.');
        }
      }

      // Cria SetupIntent
      const setupParams = {
        customer: customerId,
        'payment_method_types[]': 'card',
        'metadata[audit_purpose]': 'FREE_TEST_VALIDATION',
        'metadata[company]': company || '',
        'metadata[timestamp]': new Date().toISOString(),
      };

      const setupRes = await stripeRequest('POST', '/setup_intents', setupParams);

      if (!setupRes.data?.client_secret) {
        throw new Error(setupRes.data?.error?.message || 'Falha ao criar sessão de verificação.');
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        clientSecret: setupRes.data.client_secret,
        setupIntentId: setupRes.data.id,
        customerId
      }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Erro interno na criação do SetupIntent.' }));
    }
    return;
  }

  // 3. Verify Setup
  if (url.includes('/api/trial/verify-setup') || url.includes('/trial/verify-setup')) {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { setupIntentId } = body || {};

      if (!setupIntentId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'setupIntentId é obrigatório.' }));
        return;
      }

      const intentRes = await stripeRequest('GET', `/setup_intents/${setupIntentId}?expand[]=payment_method`);
      const setupIntent = intentRes.data;

      if (intentRes.status !== 200 || !setupIntent) {
        throw new Error(setupIntent?.error?.message || 'SetupIntent não encontrado na Stripe.');
      }

      const status = setupIntent.status;
      const pm = setupIntent.payment_method;

      if (status === 'succeeded' && pm && pm.card) {
        const card = {
          brand: (pm.card.brand || 'card').toUpperCase(),
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
          funding: pm.card.funding,
          country: pm.card.country
        };

        const trialId = `TRL-AXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          status: 'valid',
          trialId,
          card,
          message: 'Cartão validado com sucesso! Teste gratuito liberado.'
        }));
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          status: 'invalid',
          reason: setupIntent.last_setup_error?.message || `Cartão com status "${status}". Não aprovado para o teste.`
        }));
      }
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Erro ao auditar SetupIntent.' }));
    }
    return;
  }

  // Fallback 410 para rotas legadas
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    error: "A API legada do frontend foi desativada. Use a API AXION Pay autenticada.",
    api: PAY_API,
  }));
}
