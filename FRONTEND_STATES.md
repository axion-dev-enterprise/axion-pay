# Frontend States

## Pagamento

- `pending`
- `processing`
- `authorized`
- `paid`
- `failed`
- `canceled`
- `expired`
- `refunded`
- `chargeback` future-ready

## Integracao

- `connected`
- `disconnected`
- `invalid`
- `pending`

## UX

- Loading via React Query
- Error states com mensagem explicita
- Empty states para dashboard sem dados
- Toasts para acoes de salvar, criar e falhar
- Sessao protegida via route guard
- Checkout publico com feedback de status apos criacao de pagamento

