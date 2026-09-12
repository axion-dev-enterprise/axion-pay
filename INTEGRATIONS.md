# Guia de Integrações e E-commerces — AXION Pay

Este documento detalha a arquitetura de integração e o suporte a plataformas de e-commerce e vendas digitais com a **AXION Pay**.

- **Base URL Oficial**: `https://api.axionenterprise.cloud`
- **Dashboard de Conectores**: `https://pay.axionenterprise.cloud/dashboard/integrations`

---

## 1. Modos de Integração Disponíveis

| Modo | Descrição | Casos de Uso |
|---|---|---|
| **Checkout Personalizado (Headless)** | O cliente constrói o formulário no seu próprio site e consome a API AXION Pay server-to-server. | Lojas virtuais customizadas, SaaS, plataformas de cursos, apps mobile. |
| **Links de Pagamento Autônomos** | URLs prontas geradas no painel com formulário seguro de Pix e Cartão. | Vendas em WhatsApp, Instagram, faturas manuais e campanhas de anúncios. |
| **Plugins & Conectores de E-commerce** | Módulos para plataformas de mercado com sincronização de catálogo e webhook. | Shopify, WooCommerce, Nuvemshop, VTEX, Magento, Hotmart, Kiwify. |

---

## 2. Conectores para Plataformas de E-commerce

### 2.1. WooCommerce (WordPress)
- **Status**: Conector Oficial REST API v1.0
- **Método**: Plugin drop-in com suporte a Pix imediato e Cartão de Crédito.
- **Configuração**:
  1. No painel do WordPress, instale o plugin `axion-pay-woocommerce`.
  2. Insira sua `API Key de Produção` (`axp_live_...`).
  3. Cadastre a URL de Webhook fornecida pelo plugin no painel AXION Pay (`/dashboard/webhooks`).

### 2.2. Shopify (Custom App / Private Gateway)
- **Status**: Conector via Webhook & Draft Orders API.
- **Método**: Integração Serverless conectada aos webhooks `orders/create` da Shopify para disparo de Pix e liquidação automática de pedidos via API REST.

### 2.3. Nuvemshop & VTEX
- **Status**: Arquitetura via Gateway Partner API e Webhooks RFC 7807.
- **Liquidação**: Conciliação síncrona via `correlationId` com atualização imediata do status do pedido no ERP/Plataforma.

### 2.4. Hotmart, Kiwify, PerfectPay & Monetizze
- **Status**: Webhook Relay Inbound/Outbound.
- **Método**: O cliente pode utilizar a AXION Pay para receber notificações externas e conciliar transações em um painel financeiro consolidado.

---

## 3. Guia de Integração Rápida em 4 Passos

1. **Obtenha suas Credenciais**: Gere sua chave em `/dashboard/api-keys`.
2. **Defina o Método**: Escolha entre Checkout Headless (ver `CUSTOM_CHECKOUT_GUIDE.md`) ou Links de Pagamento.
3. **Configure os Webhooks**: Cadastre a URL do seu servidor em `/dashboard/webhooks` para receber `charge.completed` e `payment_intent.succeeded`.
4. **Valide em Produção**: Faça uma transação real de valor baixo (ex: R$ 1,00) para homologação do fluxo ponta a ponta.
