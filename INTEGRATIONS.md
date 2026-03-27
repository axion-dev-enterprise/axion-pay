# Integrations

## Backend reaproveitado

- `/auth/login`, `/auth/logout`
- `/signup`
- `/account/me`, `/account/api-keys`
- `/api/dashboard/overview`
- `/api/dashboard/clients`
- `/api/dashboard/pay-tags`
- `/api/dashboard/products`
- `/api/dashboard/integrations`
- `/api/dashboard/checkout-pro`
- `/payments`
- `/payments/stats`
- `/payments/:id/events`
- `/checkout/products/:slug`
- `/checkout/products/:slug/payments/:method`
- `/health`
- `/openapi.yaml`

## Adapters do frontend

- `mapUser`
- `mapApiKey`
- `mapOverview`
- `mapTransaction`
- `mapClient`
- `mapIntegration`
- `mapCheckoutProduct`
- `mapCheckoutProConfig`

## Fluxos corrigidos

- Painel agora faz bootstrap de sessao com `GET /account/me` apos login.
- Listagem de transacoes respeita a API key ativa do merchant.
- Checkout PRO usa configuracao real salva em `/api/dashboard/checkout-pro`.
- Checkout publico cria pagamento de verdade via backend atual.
- Criacao de produto no checkout gera pay-tag automaticamente quando nao existe uma disponivel.

## Fluxos ainda mockados

- Logs detalhados de webhooks
- Assinaturas recorrentes
- Relatorios analiticos avancados
- Split e chargeback operacional

