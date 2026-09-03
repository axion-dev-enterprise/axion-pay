# Operação inicial — AXION Pay

## Endpoint de produção

```text
https://api.axionenterprise.cloud
```

Verificação pública:

```bash
curl https://api.axionenterprise.cloud/health
curl https://api.axionenterprise.cloud/openapi.json
```

O serviço é um gateway **server-to-server**. A chave de API deve permanecer
somente no backend de cada merchant; ela nunca deve ser colocada em JavaScript
do navegador, URL, aplicativo mobile distribuído ou repositório.

## Distribuição para o primeiro merchant

1. Crie uma chave aleatória de ao menos 24 caracteres.
2. Adicione-a ao secret manager da infraestrutura no formato
   `segredo:merchantId:charges:read,charges:write`.
3. Atualize `AXION_API_KEYS` no ambiente do gateway e reinicie somente o
   serviço `axion-pay`.
4. Entregue o segredo por um canal seguro ao backend do merchant.
5. Faça uma chamada de homologação com uma `Idempotency-Key` exclusiva.

Exemplo de chamada do backend do merchant:

```bash
curl -X POST https://api.axionenterprise.cloud/v1/charges \
  -H 'Authorization: Bearer SUA_CHAVE_SECRETA' \
  -H 'Idempotency-Key: pedido-0001' \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":1990,"comment":"Pedido #0001"}'
```

## Ativação Woovi

O deployment inicial usa `PAYMENTS_ENABLED=false`: isso impede qualquer
cobrança ou webhook de ser processado antes da configuração do adquirente.

Quando o AppID Woovi estiver disponível no secret manager, defina no ambiente
de produção:

```env
PAYMENTS_ENABLED=true
WOOVI_API_BASE=https://api.woovi.com
WOOVI_APP_ID=...
WOOVI_WEBHOOK_PUBLIC_KEYS_URL=https://api.woovi.com/api/v1/webhook/public-keys
```

Na infraestrutura AXION, o deploy isolado lê esse segredo de
`D:\WORKSPACE\SECURE\VAULT\tokens\pagamentos\woovi_axion-pay.env`. Preencha
somente `WOOVI_APP_ID=<valor>` nesse arquivo seguro e execute
`scripts/deploy-vps-isolated.py`; a presença de um valor ativa pagamentos e
seleciona os endpoints de produção da Woovi. Não registre o AppID no Git ou no
frontend.

Em seguida, reinicie a API, gere uma cobrança de valor de homologação e cadastre
o webhook abaixo no painel Woovi:

```text
https://api.axionenterprise.cloud/webhooks/woovi
```

Só anuncie PIX como disponível após esse teste terminar com uma cobrança
confirmada e o webhook correspondente persistido no banco.

## Escopo atual

O gateway cobre PIX/Woovi com autenticação, idempotência e webhooks assinados.
Cartão, boleto, criptomoeda, split, recorrência e Open Finance não fazem parte
da distribuição inicial e não devem ser exibidos como meios de pagamento reais.

O frontend em `pay.axionenterprise.cloud` é um projeto Vercel separado e possui
fluxos próprios de checkout. Ele não deve enviar a chave do gateway ao browser
nem tratar uma simulação como pagamento aprovado. A integração correta é um
backend/BFF do merchant chamando a API acima.
