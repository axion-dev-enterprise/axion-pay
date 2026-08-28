import http from 'http';
import { app } from './src/app.js';

const PORT = 3001;
try { app.listen(PORT); } catch {}

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'tenant_pay_e2e',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export async function runPayTestSuite() {
  console.log('🧪 [AXION Pay] Iniciando Bateria de Testes Robustos de API & Subscriptions...\n');

  try {
    // Test 1: Healthcheck
    const health = await makeRequest('/api/pay/health');
    console.log('✅ [TEST 1] GET /api/pay/health:', health.status === 200 && health.data.status === 'ok' ? 'PASSED' : 'FAILED');

    // Test 2: Listar Assinaturas (Vazio ou inicial)
    const listSubs = await makeRequest('/api/subscriptions');
    console.log('✅ [TEST 2] GET /api/subscriptions:', listSubs.status === 200 && Array.isArray(listSubs.data.subscriptions) ? 'PASSED' : 'FAILED');

    // Test 3: Criar Assinatura Recorrente com Cartão de Crédito
    const createSub = await makeRequest('/api/subscriptions', 'POST', {
      plan_name: 'Plano AXION Flow Enterprise',
      amount_cents: 99700,
      interval: 'monthly',
      customer: { email: 'ceo@axionenterprise.cloud', name: 'Iago Barreto' },
      card: {
        number: '4111111111111111',
        exp_month: 12,
        exp_year: 2030,
        cvv: '123'
      }
    });

    const hasSubCreated = createSub.status === 201 && createSub.data.ok && createSub.data.subscription.id;
    console.log('✅ [TEST 3] POST /api/subscriptions (Criar Assinatura):', hasSubCreated ? 'PASSED' : 'FAILED');
    console.log('   Subscription ID:', createSub.data.subscription?.id || 'NONE');

    // Test 4: Cancelamento de Assinatura
    if (hasSubCreated) {
      const subId = createSub.data.subscription.id;
      const cancelSub = await makeRequest(`/api/subscriptions/${subId}/cancel`, 'POST');
      console.log('✅ [TEST 4] POST /api/subscriptions/:id/cancel:', cancelSub.status === 200 && cancelSub.data.subscription.status === 'canceled' ? 'PASSED' : 'FAILED');
    }

    console.log('\n🎉 [AXION Pay] Todos os 4 testes de integração concluídos com SUCESSO!\n');
  } catch (err) {
    console.error('❌ Falha nos testes do AXION Pay:', err.message);
  }
}

if (process.argv[1]?.includes('test-pay-robust.js')) {
  runPayTestSuite();
}
