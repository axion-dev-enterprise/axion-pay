import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardOverview } from '../dist/src/services/dashboard.service.js';

test('dashboard overview returns merchant and key counts even when there are no payment intents', async () => {
  let sql = '';
  const database = {
    async query(statement) {
      sql = statement;
      return {
        rows: [{
          merchants: '2',
          active_keys: '3',
          transactions_today: '0',
          volume_month_cents: '0',
        }],
      };
    },
  };

  const overview = await getDashboardOverview(database, 'auth-user-1');

  assert.deepEqual(overview, {
    merchants: 2,
    activeKeys: 3,
    transactionsToday: 0,
    volumeMonthCents: 0,
  });
  assert.match(sql, /\(SELECT COUNT\(\*\)\s+FROM payment_intents pi/);
  assert.match(sql, /\(SELECT COALESCE\(SUM\(pi\.amount_cents\), 0\)/);
});
