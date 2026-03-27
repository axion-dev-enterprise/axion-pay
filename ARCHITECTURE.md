# Architecture

## Visao

O backend existente continua responsavel por auth, dashboard, checkout publico, payments, webhooks e storage JSON. O novo frontend foi isolado em `webapp/src` com adapters para normalizar contratos antes de chegarem na UI.

## Camadas

- `app`: providers, guards e router
- `layouts`: cascas de marketing, auth e painel
- `pages`: rotas publicas, privadas e sistema
- `components`: UI base, blocos compartilhados e widgets de painel
- `services/http`: cliente HTTP central
- `services/api`: chamadas por dominio
- `services/adapters`: mapeamento de payload bruto para entidades de frontend
- `store`: sessao e API key ativa
- `types`: contratos internos
- `mocks`: dados future-ready para gaps de backend

## Decisoes

- O frontend nao consome o shape bruto das respostas.
- Sessao usa cookie do backend e persistencia local minima para UX.
- `payments` continuam protegidos por API key e por isso o painel seleciona a chave ativa.
- Checkout publico usa `/checkout/products/:slug` e `/checkout/products/:slug/payments/:method`.
- Areas ainda sem endpoint dedicado usam mocks documentados: webhook logs detalhados, billing de assinaturas e analytics avancado.

## Gaps reais

- OpenAPI atual cobre principalmente `payments` e `webhooks`; auth/dashboard nao estao descritos ali.
- Nao existe endpoint merchant para listar logs historicos de webhooks.
- Billing recorrente e assinaturas ainda precisam de endpoints especificos para deixar de ser mock.
- Criacao de checkout exige `payTagId`; o frontend resolve isso criando uma pay-tag quando necessario.

