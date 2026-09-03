import crypto from 'node:crypto';

const merchantId = process.argv[2];
const scopes = process.argv[3] ?? 'charges:read,charges:write';

if (!merchantId || !/^[a-zA-Z0-9_-]{1,80}$/.test(merchantId)) {
  console.error('Uso: pnpm api-key:create <merchantId> [escopo1,escopo2]');
  process.exit(1);
}

const secret = `axion_live_${crypto.randomBytes(32).toString('base64url')}`;
console.log(`AXION_API_KEYS=${secret}:${merchantId}:${scopes}`);
console.log('Guarde esta chave em um secret manager; ela não será exibida novamente.');
