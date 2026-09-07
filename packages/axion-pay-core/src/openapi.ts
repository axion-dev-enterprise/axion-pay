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
          '200': { description: 'Chave publicável Stripe e limites do checkout.' },
          '503': { description: 'Pagamentos por cartão ainda não configurados.' },
        },
      },
    },
    '/v1/card/payment-intents': {
      post: {
        summary: 'Cria um PaymentIntent para confirmação direta via Stripe.js',
        security: [{ axionSession: [] }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amountCents'], properties: { amountCents: { type: 'integer', minimum: 100, maximum: 100000000 } } } } } },
        responses: {
          '201': { description: 'PaymentIntent criado; confirme o clientSecret no navegador usando Stripe.js.' },
          '400': { description: 'Idempotency-Key ausente ou inválida.' },
          '401': { description: 'Sessão AXION inválida.' },
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
        responses: { '200': { description: 'Estado de assinatura e configuração da Stripe.' } },
      },
    },
    '/v1/dashboard/billing/checkout': {
      post: {
        summary: 'Cria uma sessão Stripe Checkout de assinatura mensal',
        security: [{ axionSession: [] }],
        responses: { '201': { description: 'URL hospedada de Checkout da Stripe.' }, '503': { description: 'Stripe ainda não configurada.' } },
      },
    },
    '/v1/dashboard/billing/portal': {
      post: {
        summary: 'Cria sessão do Customer Portal da Stripe',
        security: [{ axionSession: [] }],
        responses: { '200': { description: 'URL hospedada de gestão de assinatura.' }, '503': { description: 'Stripe ainda não configurada.' } },
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
    '/webhooks/woovi': {
      post: {
        security: [],
        summary: 'Recebe eventos assinados da Woovi/OpenPix',
        parameters: [{ name: 'x-webhook-signature', in: 'header', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Evento aceito.' }, '401': { description: 'Assinatura inválida.' } },
      },
    },
    '/webhooks/stripe': {
      post: {
        security: [],
        summary: 'Recebe eventos Stripe assinados e persiste estado mínimo de assinatura',
        parameters: [{ name: 'stripe-signature', in: 'header', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Evento aceito.' }, '401': { description: 'Assinatura inválida.' }, '503': { description: 'Stripe ainda não configurada.' } },
      },
    },
  },
} as const;
