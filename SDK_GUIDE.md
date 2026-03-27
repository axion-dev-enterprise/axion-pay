# SDK Guide

## Objetivo

Entregar onboarding simples para integradores JS/TS e Node usando o backend atual do AXION-PAY.

## Passos base

1. Gere uma API key no painel.
2. Configure `x-api-key` nas chamadas server-side.
3. Use `Idempotency-Key` em criacao de cobranca.
4. Consuma webhooks para reconciliacao.
5. Consulte `/payments/:id/events` para timeline operacional.

## Exemplo rapido

```ts
const response = await fetch('https://pay.axionenterprise.cloud/payments/pix', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.AXION_PAY_API_KEY!,
    'Idempotency-Key': 'charge-001',
  },
  body: JSON.stringify({
    amount: 149.9,
    customer: { name: 'Ana Souza', email: 'ana@cliente.com' },
  }),
})
```

## Boas praticas

- Nao exponha API key no browser.
- Use checkout publico por slug para experiencia client-facing.
- Trate `pending`, `processing`, `paid`, `failed`, `expired` e `refunded`.

