# AXION Pay Checkout PRO & White-Label

Solução de checkout transparente, modular e de altíssima conversão para lojistas e desenvolvedores.

---

## 1. Modos de Uso

A AXION Pay oferece duas maneiras de operar o Checkout:

### Modo A: Checkout Personalizado (Headless / Próprio)
- O lojista cria suas próprias telas em React, Vue, HTML puro ou aplicativo mobile.
- O lojista apenas consome os endpoints da API AXION Pay (`POST /v1/charges`, `POST /v1/card/payment-intents`).
- **Guia Completo**: Consulte [`CUSTOM_CHECKOUT_GUIDE.md`](./CUSTOM_CHECKOUT_GUIDE.md) para ver exemplos de código completos de backend e frontend.

### Modo B: Links de Pagamento Autônomos (Hospedados)
- Criados diretamente no painel em `/dashboard/payment-links`.
- Hospedados com segurança e alta performance na infraestrutura AXION Pay.
- Suportam Pix instantâneo, Cartão de Crédito internacional e parcelamento em até 12x.
- Branding personalizado com logotipo, cores e descrição do produto.
