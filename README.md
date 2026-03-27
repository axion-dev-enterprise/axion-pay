# AXION-PAY

Rebuild completo do frontend do gateway da AXION mantendo o backend atual em Node/Express.

## Stack

- React + Vite + TypeScript
- React Router
- TanStack Query
- Zustand
- Tailwind CSS
- Framer Motion
- React Hook Form + Zod

## Estrutura

- `src/` backend existente
- `webapp/src/` frontend rebrandado
- `public/app/` build publicado pelo Express
- `docs/openapi.yaml` contrato atual de payments/webhooks

## Fluxos principais

- Site comercial premium
- Login e cadastro por sessao
- Dashboard merchant
- Transacoes via `/payments` com API key
- Checkout PRO configuravel
- Checkout publico por slug
- Docs e SDK onboarding

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run build`
- `npm test`

## Validacao

- `npm run typecheck`
- `npm run build`
- `npm test`

## Documentacao adicional

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ROUTES.md](./ROUTES.md)
- [INTEGRATIONS.md](./INTEGRATIONS.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
- [SDK_GUIDE.md](./SDK_GUIDE.md)
- [CHECKOUT_PRO.md](./CHECKOUT_PRO.md)
- [FRONTEND_STATES.md](./FRONTEND_STATES.md)

