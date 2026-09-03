// API Serverless Handler para AXION Financeiro Executivo
// Estrutura Tri-Vertical Canônica:
// 1. 🔥 Operações Hot (Sensix: Sensix Hot, Sensix Atacadão, Sensix IT)
// 2. 🕶️ Operações Black (AXION OVERLORD: CAPI, Pixel Master, Funis de Alta Conversão, Arbitragem)
// 3. ⚪ Operações White (AXION FLOW: Flow Dashboard, AXION Pay Gateway, Juliana AI Enterprise)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const mode = url.searchParams.get('mode') || 'live'; // 'live' (limpo/real) ou 'projection'
  const isLiveClean = (mode === 'live');

  // 1. Health Check
  if (pathname === '/api/health' || pathname === '/api') {
    return res.status(200).json({
      status: 'ok',
      service: 'axion-financeiro',
      environment: 'production',
      version: '3.0.0-tri-vertical',
      verticals: ['Operações Hot (Sensix)', 'Operações Black (AXION OVERLORD)', 'Operações White (AXION FLOW)'],
      timestamp: new Date().toISOString()
    });
  }

  // 2. Auth por PIN (PIN canônico: 777)
  if (pathname === '/api/auth/pin' && req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }
    const pin = body?.pin || req.headers['x-admin-pin'];

    if (String(pin).trim() === '777') {
      return res.status(200).json({
        success: true,
        authenticated: true,
        user: {
          name: 'Master Admin AXION',
          role: 'executive_admin',
          permissions: ['read', 'write', 'export', 'simulate', 'live_sync', 'tri_vertical_access']
        },
        token: 'axion_fin_' + Buffer.from(`777:${Date.now()}`).toString('base64'),
        expiresIn: '7d'
      });
    } else {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'PIN incorreto. Acesso restrito a administradores AXION.'
      });
    }
  }

  // Custos Fixos Reais (Tech OPEX R$ 976,52 + Folha da Equipe R$ 4.250,00 = R$ 5.226,52)
  const techOpex = 976.52;
  const headcountPayroll = 4250.00;
  const fixedCostTotal = techOpex + headcountPayroll;

  // 3. Projeções de Gastos Reais Auditadas
  if (pathname === '/api/projections') {
    return res.status(200).json({
      success: true,
      updated_at: new Date().toISOString(),
      currency: 'BRL',
      pillars: {
        pillar_1_tech_opex: {
          name: 'Infraestrutura & Tecnologia (Tech OPEX Fixo)',
          total_monthly: techOpex,
          breakdown: [
            { id: 'vps_cluster_6tb9d', name: 'VPS Compute Central (6tb9d)', specs: '2 vCPUs AMD / 4 GB RAM / 60 GB SSD (Debian 13)', rate: 'R$ 0,08/h (720h/mês)', monthly_cost: 57.60, provider: 'Spaceship Starlight', ip: '104.207.81.120', status: 'active' },
            { id: 'vps_edge_jd769', name: 'VPS Edge & Observabilidade (jd769)', specs: '1 vCPU AMD / 2 GB RAM / 25 GB SSD (Debian 13)', rate: 'R$ 0,04/h (720h/mês)', monthly_cost: 28.80, provider: 'Spaceship Starlight', ip: '104.207.90.167', status: 'active' },
            { id: 'vps_expansion_00ndn', name: 'VPS Satélites & Expansão (00ndn)', specs: '1 vCPU AMD / 2 GB RAM / 25 GB SSD (Debian 13)', rate: 'R$ 0,04/h (720h/mês)', monthly_cost: 28.80, provider: 'Spaceship Starlight', ip: '159.198.39.227', status: 'active' },
            { id: 'vps_standalone_uxiip', name: 'VPS Standalone Isolada (uxiip)', specs: '1 vCPU AMD / 2 GB RAM / 25 GB SSD (Debian 13)', rate: 'R$ 0,036/h (720h/mês)', monthly_cost: 25.92, provider: 'Spaceship Starlight', ip: '104.207.90.113', status: 'active' },
            { id: 'aws_cloud', name: 'AWS Cloud Services', specs: 'Armazenamento S3, serviços gerenciados e instâncias', rate: 'Fatura Mensal', monthly_cost: 200.00, provider: 'Amazon Web Services', status: 'active' },
            { id: 'cloudflare_vercel', name: 'Cloudflare + Vercel', specs: 'Edge DNS, SSL Full Strict, CDN e Deploys Serverless', rate: 'Assinatura Mensal', monthly_cost: 100.00, provider: 'Cloudflare / Vercel', status: 'active' },
            { id: 'runpod_gpu', name: 'RunPod Cloud GPU & Serverless AI', specs: 'Inferência SDXL CyberRealistic XL ($16.48 consumo / $22 recargas)', rate: 'Consumo sob demanda', monthly_cost: 125.40, provider: 'RunPod Cloud', status: 'active' },
            { id: 'whatsapp_telecom', name: 'Telefonia WhatsApp', specs: 'Chips, instâncias Baileys e gateway WABA', rate: 'Recorrente Mensal', monthly_cost: 90.00, provider: 'Operadoras / Chips', status: 'active' },
            { id: 'claude_code', name: 'Claude Code (Anthropic)', specs: 'Assinatura Claude Code / Pro para engenharia', rate: 'Recorrente Mensal', monthly_cost: 120.00, provider: 'Anthropic', status: 'active' },
            { id: 'codex', name: 'Codex AI & Documentation', specs: 'Plataforma de documentação e engenharia', rate: 'Recorrente Mensal', monthly_cost: 100.00, provider: 'Codex', status: 'active' },
            { id: 'antigravity', name: 'Antigravity Platform', specs: 'Plataforma autônoma de desenvolvimento de agentes', rate: 'Recorrente Mensal', monthly_cost: 100.00, provider: 'Antigravity', status: 'active' }
          ]
        },
        pillar_2_headcount: {
          name: 'Capital Humano & Equipe Operacional (7 Membros Reais)',
          total_positions: 7,
          total_monthly: headcountPayroll,
          breakdown: [
            { name: 'Dev Sênior & Chefe de Ops', role: 'Tech Lead, Arquitetura de Sistemas & Governança', squad: 'Core & Ops', monthly_cost: 1000.00, share: '23.5%' },
            { name: 'Yan', role: 'Gestor de Tráfego Pago & Otimização Meta Ads', squad: 'Growth & Media', monthly_cost: 1000.00, share: '23.5%' },
            { name: 'Luís', role: 'Líder de Projetos, Entregas & Mídias Sociais', squad: 'Projects & Marketing', monthly_cost: 750.00, share: '17.6%' },
            { name: 'Yash', role: 'Engenheiro de Software / Desenvolvedor', squad: 'Dev Squad', monthly_cost: 375.00, share: '8.8%' },
            { name: 'Miguel', role: 'Engenheiro de Software / Desenvolvedor', squad: 'Dev Squad', monthly_cost: 375.00, share: '8.8%' },
            { name: 'Michel', role: 'Engenheiro de Software / Desenvolvedor', squad: 'Dev Squad', monthly_cost: 375.00, share: '8.8%' },
            { name: 'Yuri', role: 'Engenheiro de Software / Desenvolvedor', squad: 'Dev Squad', monthly_cost: 375.00, share: '8.8%' }
          ]
        },
        pillar_3_media_acquisition: {
          name: 'Mídia Paga & Aquisição de Clientes (Meta Ads)',
          scenarios: {
            conservative: { label: 'Cenário Conservador', monthly_budget: 5000.00 },
            aggressive: { label: 'Cenário Agressivo (Escala)', monthly_budget: 10000.00 }
          }
        }
      },
      fixed_operating_cost: fixedCostTotal,
      total_operations: {
        with_meta_5k: fixedCostTotal + 5000.00,
        with_meta_10k: fixedCostTotal + 10000.00
      }
    });
  }

  // 4. 🔥 VERTICAL 1: OPERAÇÕES HOT (SENSIX)
  if (pathname === '/api/operations/hot' || pathname === '/api/sensix/hot') {
    const grossRevenue = isLiveClean ? 103.82 : 128740.00;
    const hotSubscribers = isLiveClean ? 10 : 348;
    const leadsCount = isLiveClean ? 1839 : 14200;
    const conversionRate = isLiveClean ? '0.5%' : '2.45%';

    const realCreators = [
      { id: 'manuzinha-schwartz', name: 'Manuzinha Schwartz', handle: '@Manuzinha_Schwartz_bot', price_brl: 39.90, followers: '32.5k', posts_count: 102, rank: 1, tier: 'VIP EXCLUSIVE', active_subscribers: isLiveClean ? 3 : 54, leads: isLiveClean ? 769 : 4500, pix_generated: isLiveClean ? 948 : 2800, monthly_revenue: isLiveClean ? 39.80 : 5120.00, conv: '0.4%' },
      { id: 'dudinha-x1', name: 'dudinhax1', handle: '@dudax1_bot', price_brl: 14.90, followers: '11.7k', posts_count: 18, rank: 2, tier: 'RISING', active_subscribers: isLiveClean ? 1 : 28, leads: isLiveClean ? 451 : 2100, pix_generated: isLiveClean ? 756 : 1400, monthly_revenue: isLiveClean ? 14.90 : 1890.00, conv: '0.2%' },
      { id: 'sharkbot-aggregate', name: 'SharkBot Analytics (Outros Bots)', handle: 'SharkBot Engine', price_brl: 29.90, followers: '45.0k', posts_count: 150, rank: 3, tier: 'AUTOMATION', active_subscribers: isLiveClean ? 7 : 140, leads: isLiveClean ? 1070 : 6200, pix_generated: isLiveClean ? 1850 : 8500, monthly_revenue: isLiveClean ? 64.02 : 18500.00, conv: '0.7%' },
      { id: 'lany-mal', name: 'Lany do Mal', handle: '@sucklany_bot', price_brl: 29.90, followers: '15.3k', posts_count: 15, rank: 4, tier: 'STANDARD', active_subscribers: 0, leads: 29, pix_generated: 58, monthly_revenue: 0.00, conv: '0.0%' },
      { id: 'lili-fox', name: 'Lili Fox', handle: '@linefox_bot', price_brl: 29.90, followers: '28.4k', posts_count: 43, rank: 5, tier: 'PREMIUM', active_subscribers: 0, leads: 27, pix_generated: 25, monthly_revenue: 0.00, conv: '0.0%' },
      { id: 'leticia-vargas', name: 'Leticia Vargas', handle: '@Letisvg_', price_brl: 29.90, followers: '14.2k', posts_count: 22, rank: 6, tier: 'HIGH TIER', active_subscribers: isLiveClean ? 0 : 86, leads: isLiveClean ? 0 : 1200, pix_generated: isLiveClean ? 0 : 650, monthly_revenue: isLiveClean ? 0.00 : 6590.00, conv: '0.0%' },
      { id: 'bianca-trois', name: 'Bianca Trois', handle: '@biatrois', price_brl: 34.90, followers: '21.8k', posts_count: 36, rank: 7, tier: 'FEATURED', active_subscribers: isLiveClean ? 0 : 74, leads: isLiveClean ? 0 : 980, pix_generated: isLiveClean ? 0 : 540, monthly_revenue: isLiveClean ? 0.00 : 6120.00, conv: '0.0%' }
    ];

    return res.status(200).json({
      success: true,
      vertical: 'Operações Hot (Sensix)',
      mode: isLiveClean ? 'live_real_audited' : 'projected_scale',
      gross_revenue_monthly: grossRevenue,
      subscribers_total: hotSubscribers,
      leads_total: leadsCount,
      conversion_rate: conversionRate,
      sub_units: [
        { name: 'Sensix Hot (hot.axionenterprise.cloud)', type: 'Creator VIP & PPV Bots', revenue: isLiveClean ? 103.82 : 38450.00, share: isLiveClean ? '100.0%' : '29.9%', subscribers: hotSubscribers, leads: leadsCount, breakdown: 'Nexus Pay (R$ 39,80) + SharkBot Analytics (R$ 64,02)' },
        { name: 'Sensix Atacadão (sensixatacadao.com)', type: 'B2B E-commerce', revenue: isLiveClean ? 0.00 : 67890.00, share: isLiveClean ? '0.0%' : '52.7%', orders: isLiveClean ? 1 : 142, skus: 48, pending_client: 'Nylmara Fernandes marinho (R$ 56,92)' },
        { name: 'Sensix IT AI Studio (sensix.it.com)', type: 'SaaS AI SDXL', revenue: isLiveClean ? 0.00 : 22400.00, share: isLiveClean ? '0.0%' : '17.4%', subscribers: isLiveClean ? 0 : 64, model: 'CyberRealistic XL v6.0' }
      ],
      creators: realCreators,
      gateway: {
        provider: 'Nexus Pay (NexusPag) + SharkBot',
        nexus_revenue: 39.80,
        shark_revenue: 64.02,
        total_live_revenue: 103.82,
        pix_key: '9a4cff98-1a60-433b-9b36-8cac111cbdfd',
        merchant: 'Sensix SP (Sao Paulo)'
      }
    });
  }

  // 5. 🕶️ VERTICAL 2: OPERAÇÕES BLACK (AXION OVERLORD)
  if (pathname === '/api/operations/black') {
    const grossRevenue = isLiveClean ? 0.00 : 85000.00;
    const leadsGenerated = isLiveClean ? 0 : 14200;
    const activeFunnels = isLiveClean ? 3 : 8;

    return res.status(200).json({
      success: true,
      vertical: 'Operações Black (AXION OVERLORD)',
      mode: isLiveClean ? 'live_real_audited' : 'projected_scale',
      gross_revenue_monthly: grossRevenue,
      roas_average: isLiveClean ? '0.0x' : '5.67x',
      components: [
        {
          name: 'Pixel Master & CAPI Engine',
          role: 'Deduplicação de Conversões Meta Ads (SHA-256 client/server)',
          status: 'online_active',
          events_tracked_month: isLiveClean ? 0 : 48920,
          match_rate: '94.8%'
        },
        {
          name: 'Funis de Alta Conversão WhatsApp & Telegram',
          role: 'Automação de Checkout Rápido & Conversão de Leads',
          status: 'active',
          leads: leadsGenerated,
          conversion_rate: isLiveClean ? '0.0%' : '14.6%'
        },
        {
          name: 'Infraestrutura de Contingência & Cloaking',
          role: 'Túneis Cloudflare, Rotação de IPs e Multi-Domínios',
          status: 'shield_active',
          active_nodes: 4,
          uptime: '99.98%'
        }
      ],
      meta_ads_allocation: {
        budget_monthly: 15000.00,
        target_revenue: grossRevenue,
        projected_ebitda: isLiveClean ? -15000.00 : 70000.00
      }
    });
  }

  // 6. ⚪ VERTICAL 3: OPERAÇÕES WHITE (AXION FLOW & ENTERPRISE)
  if (pathname === '/api/operations/white') {
    const grossRevenue = isLiveClean ? 0.00 : 64500.00;
    const activeTenants = isLiveClean ? 0 : 28;

    return res.status(200).json({
      success: true,
      vertical: 'Operações White (AXION FLOW & Enterprise)',
      mode: isLiveClean ? 'live_real_audited' : 'projected_scale',
      gross_revenue_monthly: grossRevenue,
      sub_units: [
        {
          name: 'AXION Flow Dashboard (flow.axionenterprise.cloud)',
          type: 'SaaS Builder de Funis & Automações Omnichannel',
          revenue: isLiveClean ? 0.00 : 32500.00,
          tenants: activeTenants,
          active_bridges: 12
        },
        {
          name: 'AXION Pay Gateway (pay.axionenterprise.cloud)',
          type: 'Gateway de Pagamentos & Checkout Transparente',
          revenue: isLiveClean ? 0.00 : 18000.00,
          volume_processed: isLiveClean ? 0.00 : 450000.00,
          take_rate: '2.5% + R$ 0,50'
        },
        {
          name: 'Hermes Central Juliana (juliana.axionenterprise.cloud)',
          type: 'AI Executive Assistant Corporativo & RAG B2B',
          revenue: isLiveClean ? 0.00 : 14000.00,
          enterprise_licenses: isLiveClean ? 0 : 14,
          daily_ai_runs: 850
        }
      ]
    });
  }

  // 7. 🌐 VISÃO GERAL CONSOLIDADA (TRI-VERTICAL OVERVIEW)
  if (pathname === '/api/overview' || pathname === '/api') {
    const revHot = isLiveClean ? 103.82 : 128740.00;
    const revBlack = isLiveClean ? 0.00 : 85000.00;
    const revWhite = isLiveClean ? 0.00 : 64500.00;
    const grossRevenueTotal = revHot + revBlack + revWhite; 

    const metaAds = 10000.00;
    const gatewayAndTaxes = grossRevenueTotal * 0.08;

    const totalCosts = fixedCostTotal + metaAds + gatewayAndTaxes;
    const netEbitda = grossRevenueTotal - totalCosts;
    const netMarginPercent = grossRevenueTotal > 0 ? (netEbitda / grossRevenueTotal) * 100 : 0;
    const multiplier = totalCosts > 0 ? (grossRevenueTotal / totalCosts) : 0;

    return res.status(200).json({
      success: true,
      period: 'Mensal Consolidado (Setembro 2026)',
      mode: isLiveClean ? 'live_clean_baseline' : 'projected_scale',
      currency: 'BRL',
      consolidated_kpis: {
        gross_revenue_total: grossRevenueTotal,
        fixed_tech_opex: techOpex,
        headcount_payroll: headcountPayroll,
        fixed_cost_subtotal: fixedCostTotal,
        meta_ads_budget: metaAds,
        gateway_and_taxes_est: gatewayAndTaxes,
        total_monthly_expenses: totalCosts,
        net_operating_ebitda: netEbitda,
        net_margin_percentage: Number(netMarginPercent.toFixed(2)),
        operational_roi_multiplier: Number(multiplier.toFixed(2))
      },
      verticals: [
        {
          id: 'vertical_hot',
          name: '🔥 Operações Hot (Sensix)',
          description: 'Sensix Hot (VIP & PPV) + Sensix Atacadão B2B + Sensix IT AI Studio',
          revenue: revHot,
          share: grossRevenueTotal > 0 ? '46.3%' : '0.0%',
          status: isLiveClean ? 'live_clean' : 'active_scale'
        },
        {
          id: 'vertical_black',
          name: '🕶️ Operações Black (AXION OVERLORD)',
          description: 'Pixel Master, CAPI Engine, Funis de Alta Conversão & Contingência',
          revenue: revBlack,
          share: grossRevenueTotal > 0 ? '30.5%' : '0.0%',
          status: isLiveClean ? 'live_clean' : 'active_scale'
        },
        {
          id: 'vertical_white',
          name: '⚪ Operações White (AXION FLOW)',
          description: 'AXION Flow Funis + AXION Pay Gateway + Hermes Juliana Enterprise AI',
          revenue: revWhite,
          share: grossRevenueTotal > 0 ? '23.2%' : '0.0%',
          status: isLiveClean ? 'live_clean' : 'high_growth'
        }
      ]
    });
  }

  // Retrocompatibilidade
  if (pathname === '/api/sensix/atacadao') {
    return res.status(200).json({ success: true, service: 'Sensix Atacadão', gross_revenue_monthly: isLiveClean ? 0.00 : 67890.00 });
  }
  if (pathname === '/api/sensix/it') {
    return res.status(200).json({ success: true, service: 'Sensix IT', gross_revenue_monthly: isLiveClean ? 0.00 : 22400.00 });
  }

  return res.status(404).json({ error: 'Endpoint não encontrado', path: pathname });
}
