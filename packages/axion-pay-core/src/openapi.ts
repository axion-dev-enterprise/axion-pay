export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'AXION Pay API',
    version: '0.1.0',
    description: 'Gateway PIX server-to-server da AXION Pay.',
  },
  servers: [{ url: 'https://api.axionenterprise.cloud' }, { url: 'http://localhost:3333' }],
  security: [{ apiKey: [] }],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API key',
      },
      axionSession: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'AXION session token',
      },
    },
    schemas: {
      Charge: {
        type: 'object',
        required: ['id', 'correlationId', 'status', 'amountCents', 'currency'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          correlationId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['CREATING', 'ACTIVE', 'PENDING', 'PAID', 'EXPIRED', 'REFUNDED', 'FAILED'] },
          amountCents: { type: 'integer', minimum: 1 },
          currency: { type: 'string', example: 'BRL' },
          qrCodeUrl: { type: ['string', 'null'], format: 'uri' },
          brCode: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        security: [],
        responses: { '200': { description: 'Dependências disponíveis.' }, '503': { description: 'Dependência indisponível.' } },
      },
    },
    '/v1/sandbox/validate': {
      get: {
        summary: 'Valida uma chave pública do ambiente sandbox',
        responses: {
          '200': { description: 'Chave sandbox autenticada e isolada de pagamentos live.' },
          '401': { description: 'Chave inválida.' },
          '403': { description: 'Chave sem escopo sandbox:read.' },
        },
      },
    },
    '/v1/charges': {
      post: {
        summary: 'Cria uma cobrança PIX',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['amountCents'], properties: { amountCents: { type: 'integer', minimum: 1 }, comment: { type: 'string', maxLength: 140 } } } } },
        },
        responses: { '201': { description: 'Cobrança criada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Charge' } } } }, '400': { description: 'Requisição inválida.' }, '401': { description: 'API key inválida.' }, '409': { description: 'Idempotência reutilizada com valor diferente.' } },
      },
    },
    '/v1/charges/{correlationId}': {
      get: {
        summary: 'Consulta uma cobrança do merchant autenticado',
        parameters: [{ name: 'correlationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Cobrança.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Charge' } } } }, '404': { description: 'Não encontrada.' } },
      },
    },
    '/v1/card/config': {
      get: {
        security: [],
        summary: 'Retorna a configuração pública do checkout de cartão',
        responses: {
          '200': { description: 'Configuração pública dos campos seguros e limites do checkout.' },
          '503': { description: 'Pagamentos por cartão ainda não configurados.' },
        },
      },
    },
    '/v1/card/payment-intents': {
      post: {
        summary: 'Cria uma intenção de pagamento para confirmação nos campos seguros AXION Pay',
        security: [{ apiKey: [] }, { axionSession: [] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amountCents'], properties: { amountCents: { type: 'integer', minimum: 100, maximum: 100000000 }, receiptEmail: { type: 'string', format: 'email' }, customerEmail: { type: 'string', format: 'email' }, metadata: { type: 'object', additionalProperties: { type: 'string' } } } } } } },
        responses: {
          '201': { description: 'Intenção criada; confirme o clientSecret no navegador usando AXION Secure Fields.' },
          '400': { description: 'Idempotency-Key ausente ou inválida.' },
          '401': { description: 'API Key ou sessão AXION inválida.' },
          '403': { description: 'Escopo insuficiente.' },
          '422': { description: 'Merchant ativo não encontrado.' },
          '503': { description: 'Pagamentos por cartão ainda não configurados.' },
        },
      },
    },
    '/v1/dashboard/me': {
      get: {
        summary: 'Valida a sessão AXION e retorna o usuário do dashboard',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Usuário autenticado.' }, '401': { description: 'Sessão inválida ou expirada.' } },
      },
    },
    '/v1/dashboard/overview': {
      get: {
        summary: 'Retorna indicadores persistentes do dashboard',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Indicadores do usuário autenticado.' }, '401': { description: 'Sessão inválida ou expirada.' } },
      },
    },
    '/v1/dashboard/merchants': {
      get: {
        summary: 'Lista merchants do usuário autenticado',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Merchants persistidos.' } },
      },
      post: {
        summary: 'Cria um merchant',
        security: [{ axionSession: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 120 }, document: { type: 'string', maxLength: 32 }, billingEmail: { type: 'string', format: 'email' } } } } } },
        responses: { '201': { description: 'Merchant criado.' }, '401': { description: 'Sessão inválida ou expirada.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}': {
      patch: {
        summary: 'Ativa ou inativa um merchant',
        security: [{ axionSession: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } } } } } },
        responses: { '200': { description: 'Merchant atualizado.' }, '404': { description: 'Merchant não encontrado.' } },
      },
    },
    '/v1/dashboard/api-keys': {
      get: {
        summary: 'Lista chaves de API dos merchants do usuário',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Chaves de API persistidas.' } },
      },
      post: {
        summary: 'Gera uma chave de API e retorna o segredo uma única vez',
        security: [{ axionSession: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['merchantId', 'name'], properties: { merchantId: { type: 'string', format: 'uuid' }, name: { type: 'string', maxLength: 120 } } } } } },
        responses: { '201': { description: 'Chave criada; armazene o segredo retornado.' }, '404': { description: 'Merchant ativo não encontrado.' } },
      },
    },
    '/v1/dashboard/api-keys/{keyId}/revoke': {
      post: {
        summary: 'Revoga uma chave de API ativa',
        security: [{ axionSession: [] }],
        parameters: [{ name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Chave revogada.' }, '404': { description: 'Chave ativa não encontrada.' } },
      },
    },
    '/v1/dashboard/transactions': {
      get: {
        summary: 'Lista até 100 transações do usuário autenticado',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Transações persistidas.' } },
      },
    },
    '/v1/dashboard/settings': {
      get: {
        summary: 'Obtém configurações do dashboard',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Configurações persistidas.' } },
      },
      post: {
        summary: 'Salva configurações do dashboard',
        security: [{ axionSession: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['organizationName'], properties: { organizationName: { type: 'string', maxLength: 120 } } } } } },
        responses: { '200': { description: 'Configurações atualizadas.' } },
      },
    },
    '/v1/dashboard/onboarding': {
      get: {
        summary: 'Obtém o cadastro e o status de KYC do titular autenticado',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Perfil de onboarding persistido ou nulo.' } },
      },
      put: {
        summary: 'Salva o perfil comercial para onboarding e KYC',
        security: [{ axionSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  legalEntityType: { type: 'string', enum: ['INDIVIDUAL', 'BUSINESS'] },
                  legalName: { type: 'string', maxLength: 160 },
                  tradingName: { type: 'string', maxLength: 160 },
                  documentNumber: { type: 'string', description: 'Usado somente para gerar hash e últimos quatro dígitos; não é persistido em claro.' },
                  billingEmail: { type: 'string', format: 'email' },
                  phoneE164: { type: 'string', example: '+5511999999999' },
                  countryCode: { type: 'string', minLength: 2, maxLength: 2, example: 'BR' },
                  websiteUrl: { type: 'string', format: 'uri' },
                  businessDescription: { type: 'string', minLength: 10, maxLength: 1000 },
                  acceptTerms: { type: 'boolean' },
                  acceptPrivacy: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Rascunho salvo.' }, '409': { description: 'KYC em revisão ou concluído.' } },
      },
    },
    '/v1/dashboard/onboarding/submit': {
      post: {
        summary: 'Envia o perfil completo para revisão KYC',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'KYC submetido.' }, '422': { description: 'Dados e aceites obrigatórios ausentes.' } },
      },
    },
    '/v1/dashboard/billing': {
      get: {
        summary: 'Obtém o estado persistido da assinatura do portal',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Estado da assinatura e configuração do AXION Billing.' } },
      },
    },
    '/v1/dashboard/billing/checkout': {
      post: {
        summary: 'Cria uma sessão AXION Pay para assinatura mensal',
        security: [{ axionSession: [] }],
        responses: { '201': { description: 'URL segura do checkout AXION Pay.' }, '503': { description: 'Cobrança recorrente ainda não configurada.' } },
      },
    },
    '/v1/dashboard/billing/portal': {
      post: {
        summary: 'Cria sessão do portal de assinatura AXION Pay',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'URL segura de gestão da assinatura.' }, '503': { description: 'Cobrança recorrente ainda não configurada.' } },
      },
    },
    '/v1/internal/kyc/applications': {
      get: {
        summary: 'Lista solicitações KYC para analistas autorizados',
        security: [{ axionSession: [] }],
        parameters: [{ name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED'] } }],
        responses: { '200': { description: 'Fila de KYC minimizada.' }, '403': { description: 'Revisor não autorizado.' } },
      },
    },
    '/v1/internal/kyc/applications/{authUserId}/review': {
      post: {
        summary: 'Registra uma decisão manual de KYC e trilha de auditoria',
        security: [{ axionSession: [] }],
        parameters: [{ name: 'authUserId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['IN_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED'] }, reason: { type: 'string', maxLength: 1000 } } } } } },
        responses: { '200': { description: 'Decisão persistida e auditada.' }, '403': { description: 'Revisor não autorizado.' }, '409': { description: 'Solicitação não disponível para decisão.' } },
      },
    },
    '/v1/dashboard/integrations': {
      get: {
        summary: 'Retorna o estado real do provedor e dos pagamentos',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'Estado do gateway.' } },
      },
    },
    '/v1/merchant/webhooks': {
      get: {
        summary: 'Lista webhooks cadastrados para o merchant',
        security: [{ apiKey: [] }],
        responses: { '200': { description: 'Lista de webhooks.' } },
      },
      post: {
        summary: 'Cadastra ou atualiza um endpoint de webhook',
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Webhook cadastrado; retorna URL e segredo de assinatura (whsec_*).' },
          '400': { description: 'URL inválida ou eventos ausentes.' },
        },
      },
    },
    '/v1/merchant/webhooks/{id}': {
      delete: {
        summary: 'Exclui um endpoint de webhook do merchant',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Webhook excluído.' }, '404': { description: 'Não encontrado.' } },
      },
    },
    '/v1/merchant/webhooks/{id}/test': {
      post: {
        summary: 'Dispara um evento de teste para o endpoint de webhook',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Disparo de teste realizado e entrega registrada.' },
          '404': { description: 'Webhook não encontrado.' },
        },
      },
    },
    '/v1/merchant/webhooks/deliveries': {
      get: {
        summary: 'Lista histórico de entregas de webhooks do merchant',
        security: [{ apiKey: [] }],
        responses: { '200': { description: 'Histórico de tentativas e status das entregas.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/webhooks': {
      get: {
        summary: 'Lista webhooks cadastrados para o merchant (Painel Dashboard)',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Lista de webhooks.' } },
      },
      post: {
        summary: 'Cadastra um novo webhook para o merchant via painel',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '201': { description: 'Webhook criado com secret retornado.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/webhooks/{id}': {
      delete: {
        summary: 'Remove um webhook do merchant via painel',
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Webhook removido com sucesso.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/webhooks/{id}/test': {
      post: {
        summary: 'Dispara um webhook de teste a partir do painel',
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Teste enviado com sucesso.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/webhooks/deliveries': {
      get: {
        summary: 'Lista histórico de entregas do merchant (Painel Dashboard)',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Histórico de entregas.' } },
      },
    },
    '/v1/subscriptions': {
      post: {
        summary: 'Cria uma assinatura recorrente para o cliente do merchant',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customerEmail', 'amountCents'],
                properties: {
                  customerEmail: { type: 'string', format: 'email' },
                  customerName: { type: 'string', maxLength: 120 },
                  amountCents: { type: 'integer', minimum: 100, maximum: 100000000 },
                  interval: { type: 'string', enum: ['month', 'year'], default: 'month' },
                  currency: { type: 'string', example: 'BRL' },
                  paymentMethodId: { type: 'string' },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Assinatura criada com sucesso.' },
          '400': { description: 'Requisição inválida ou parâmetros ausentes.' },
          '503': { description: 'Assinaturas por cartão não configuradas.' },
        },
      },
    },
    '/v1/subscriptions/{id}': {
      get: {
        summary: 'Consulta status e ciclo de uma assinatura recorrente',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Dados da assinatura.' }, '404': { description: 'Não encontrada.' } },
      },
    },
    '/v1/subscriptions/{id}/cancel': {
      post: {
        summary: 'Cancela uma assinatura recorrente',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  immediately: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Assinatura cancelada.' }, '404': { description: 'Não encontrada.' } },
      },
    },
    '/v1/subscriptions/{id}/renew-checkout': {
      post: {
        summary: 'Renova a Checkout Session de uma assinatura expirada ou pendente sem duplicar o contrato',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Novo link de checkout gerado com sucesso para envio ao cliente.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    checkoutUrl: { type: 'string', format: 'uri' },
                    status: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { description: 'Assinatura não encontrada.' },
        },
      },
    },
    '/v1/payment-links': {
      get: {
        summary: 'Lista todos os links de pagamento do merchant autenticado',
        security: [{ apiKey: [] }],
        responses: { '200': { description: 'Lista de links de pagamento.' } },
      },
      post: {
        summary: 'Cria um novo link de pagamento compartilhável (PIX ou Cartão)',
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', maxLength: 120 },
                  description: { type: 'string', maxLength: 500 },
                  amountCents: { type: 'integer', minimum: 100, maximum: 100000000 },
                  allowCustomAmount: { type: 'boolean', default: false },
                  acceptedMethods: { type: 'array', items: { type: 'string', enum: ['PIX', 'CARD'] }, default: ['PIX', 'CARD'] },
                  expiresAt: { type: 'string', format: 'date-time' },
                  maxUses: { type: 'integer', minimum: 1 },
                  metadata: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Link criado com sucesso.' } },
      },
    },
    '/v1/payment-links/{id}': {
      get: {
        summary: 'Consulta pública dos dados de um link de pagamento (para compradores)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Dados públicos do link de pagamento.' }, '404': { description: 'Não encontrado ou expirado.' } },
      },
      delete: {
        summary: 'Remove ou desativa um link de pagamento do merchant',
        security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Link removido.' }, '404': { description: 'Não encontrado.' } },
      },
    },
    '/v1/payment-links/{id}/pay': {
      post: {
        summary: 'Processa o pagamento de um link público (Gera QR Code PIX ou client_secret Stripe)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['paymentMethod'],
                properties: {
                  paymentMethod: { type: 'string', enum: ['PIX', 'CARD'] },
                  amountCents: { type: 'integer', minimum: 100, maximum: 100000000 },
                  customerName: { type: 'string', maxLength: 120 },
                  customerEmail: { type: 'string', format: 'email' },
                  customerDocument: { type: 'string', maxLength: 32 },
                  customerPhone: { type: 'string', maxLength: 32 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Pagamento iniciado.' }, '400': { description: 'Erro na requisição.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/whatsapp/settings': {
      get: {
        summary: 'Obtém as configurações da Régua de Notificações via WhatsApp do merchant',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Configurações de WhatsApp retornadas.' } },
      },
      put: {
        summary: 'Salva ou atualiza as configurações da Régua de Notificações via WhatsApp do merchant',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Configurações salvas com sucesso.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/whatsapp/test': {
      post: {
        summary: 'Dispara uma notificação de teste via WhatsApp para simular o recebimento',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Teste enviado com sucesso.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/whatsapp/logs': {
      get: {
        summary: 'Consulta o histórico auditável de disparos via WhatsApp do merchant',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Logs de entrega retornados.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/api-logs': {
      get: {
        summary: 'Lista histórico de requisições HTTP recebidas pela API (Request Inspector) com métricas',
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 25 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } },
          { name: 'method', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'statusCode', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Histórico de requisições e métricas 24h retornados com sucesso.' } },
      },
      delete: {
        summary: 'Purga o histórico de logs de requisição do merchant',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Logs purgados com sucesso.' } },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/api-logs/{id}': {
      get: {
        summary: 'Obtém detalhes completos de uma requisição HTTP gravada (payloads, headers, latência)',
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Detalhes da requisição retornados.' } },
      },
    },
    '/v1/api-logs': {
      get: {
        summary: 'Consulta programática S2S dos logs de API da operação autenticada',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 25 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } },
          { name: 'method', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'statusCode', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Logs de API retornados com sucesso.' } },
      },
    },
    '/v1/portal/subscriptions/{token}': {
      get: {
        summary: 'Obtém dados completos da assinatura e histórico de faturas via token seguro de autoatendimento do cliente',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Dados da assinatura e faturas retornados com sucesso.' },
          '404': { description: 'Assinatura não encontrada ou token inválido.' },
        },
      },
    },
    '/v1/portal/subscriptions/{token}/cancel': {
      post: {
        summary: 'Cancela a assinatura através do portal self-service do assinante com registro de motivo',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { reason: { type: 'string', maxLength: 500 } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Assinatura cancelada com sucesso.' },
          '404': { description: 'Assinatura não encontrada.' },
        },
      },
    },
    '/v1/portal/subscriptions/{token}/reactivate': {
      post: {
        summary: 'Reativa uma assinatura cancelada pelo próprio cliente no portal self-service',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Assinatura reativada com sucesso.' },
          '404': { description: 'Assinatura não encontrada.' },
        },
      },
    },
    '/v1/portal/subscriptions/{token}/payment-method': {
      post: {
        summary: 'Atualiza o cartão de crédito / método de pagamento cadastrado na assinatura',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['brand', 'last4'],
                properties: {
                  brand: { type: 'string' },
                  last4: { type: 'string', minLength: 4, maxLength: 4 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Método de pagamento atualizado com sucesso.' },
          '404': { description: 'Assinatura não encontrada.' },
        },
      },
    },
    '/v1/dashboard/merchants/{merchantId}/subscriptions': {
      get: {
        summary: 'Lista assinaturas do merchant com métricas de MRR, assinantes ativos e churn',
        security: [{ sessionAuth: [] }],
        parameters: [
          { name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Lista de assinaturas e métricas calculadas.' } },
      },
      post: {
        summary: 'Cria uma nova assinatura recorrente para um cliente com geração automática do link do portal self-service',
        security: [{ sessionAuth: [] }],
        parameters: [{ name: 'merchantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId', 'customerName', 'customerEmail'],
                properties: {
                  planId: { type: 'string', format: 'uuid' },
                  customerName: { type: 'string' },
                  customerEmail: { type: 'string', format: 'email' },
                  customerTaxId: { type: 'string' },
                  customerPhone: { type: 'string' },
                  paymentMethodBrand: { type: 'string' },
                  paymentMethodLast4: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Assinatura criada com portal_url gerado.' } },
      },
    },
  },
} as const;
