# Checkout PRO

## Objetivo

Transformar o checkout do merchant em produto vendavel para terceiros, com branding, preview e experiencia premium.

## Capacidade atual

- Branding salvo por merchant
- Hero title e subtitle editaveis
- Cores primarias e destaque
- Preview no painel
- Publicacao por slug
- Pagamento via PIX ou cartao no checkout publico

## Dependencias do backend

- Produto precisa de `payTagId`
- Metodos permitidos vem de `paymentConfig.allowedMethods`
- Pagamento final usa `/checkout/products/:slug/payments/:method`

## Gaps futuros

- Upload real de logo
- Campos customizaveis por checkout
- Parcelamento avancado
- Callback visual configuravel por merchant

