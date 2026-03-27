# API Reference

## Auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /signup`
- `GET /account/me`
- `POST /account/api-keys`
- `DELETE /account/api-keys/:id`

## Dashboard

- `GET /api/dashboard/overview`
- `GET /api/dashboard/clients`
- `GET /api/dashboard/pay-tags`
- `POST /api/dashboard/pay-tags`
- `GET /api/dashboard/products`
- `POST /api/dashboard/products`
- `PATCH /api/dashboard/products/:id`
- `DELETE /api/dashboard/products/:id`
- `GET /api/dashboard/integrations`
- `PUT /api/dashboard/integrations`
- `GET /api/dashboard/checkout-pro`
- `PUT /api/dashboard/checkout-pro`

## Payments

- `GET /payments`
- `GET /payments/stats`
- `GET /payments/:id/events`
- `POST /payments`
- `POST /payments/pix`
- `POST /payments/card`
- `POST /payments/:id/confirm`
- `POST /payments/:id/capture`
- `POST /payments/:id/cancel`
- `POST /payments/:id/refund`

## Checkout publico

- `GET /checkout/products/:slug`
- `POST /checkout/products/:slug/payments/:method`

## Health e contrato

- `GET /health`
- `GET /openapi.yaml`

