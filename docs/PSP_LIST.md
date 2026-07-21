# PSPs e Bancos sugeridos para integracao

Abaixo, uma lista (nao exaustiva) de **PSPs** e **bancos** que podem ser utilizados para montar o seu gateway,
seja para **PIX**, **cartao** ou ambos. Verifique sempre a documentacao oficial de cada um e condicoes comerciais.

## PSPs / Gateways de Pagamento (Cartao + Outros)

- **Pagar.me** - forte no Brasil, suporte a cartao, boleto, PIX, marketplace e split.
- **Stripe** - referencia global em dev experience, cartao, PIX (via parceiros), boleto etc.
- **Iugu** - foco em cobrancas recorrentes, boleto, cartao, PIX.
- **Mercado Pago** - carteira digital, cartao, boleto, PIX, forte no e-commerce.
- **Asaas** - cobrancas boleto/PIX, cartao, carne, recorrencia.
- **Juno (Boleto/PIX)** - solucoes de cobrancas integradas.
- **PagSeguro** - cartao, boleto, PIX, maquininhas, links de pagamento.
- **Stone** - adquirente, solucoes omnichannel (maquininhas, link, API).
- **Cielo** - adquirente consolidado, suporte cartao credito/debito, e-commerce.

## Bancos com foco em API / PIX

- **Banco Inter (PJ)** - API para PIX, boletos e servicos de conta PJ.
- **Banco Original (PJ)** - multiplos servicos de cash management e integracoes B2B.
- **Banco BS2** - historicamente forte em solucoes para empresas e cambio.
- **Banco do Brasil** - boletos, arrecadacao, PIX Cobranca (mediante convenio).
- **Caixa Economica Federal** - solucoes de cobranca e pagamentos (requer convenios especificos).
- **Bradesco** - cobranca, boletos, PIX, integracao com canais corporativos.
- **Itau** - APIs para empresas (cobranca, pagamentos, extratos, PIX).
- **Santander** - solucoes empresariais e APIs especificas (conta/PIX/boletos).
- **Sicredi / Sicoob** - cooperativas de credito com recursos de cobranca e PIX.

## Estrategia recomendada

1. **Fase inicial (MVP)**:
   - Usar um PSP como Pagar.me, Iugu ou Mercado Pago para cartao e, se desejado, tambem para PIX.
   - Isso reduz o esforco de compliance e permite ir para producao mais rapido.

2. **Fase de consolidacao**:
   - Integrar diretamente com bancos selecionados para **PIX Cobranca** (reduzindo custo e ganhando controle).
   - Manter PSPs como fallback ou redundancia.

3. **Fase avancada**:
   - Negociar com multiplos adquirentes (Stone, Cielo, PagSeguro) para cartao, usando seu gateway como camada de roteamento.
   - Implementar regras de roteamento inteligente (melhor taxa, menor latencia, reputacao por BIN, etc.).

Sempre confira:

- Requisitos de KYC/AML;
- Condicoes comerciais (taxas, prazos de repasse);
- Limites de operacao por transacao/dia/mes;
- Documentacao de API, estabilidade e suporte tecnico.
