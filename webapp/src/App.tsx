import './landing.css';
import { ArrowUpRight, ArrowRight, ShieldCheck, CreditCard, Zap, Globe2, Flame, Gamepad2, Layers, KeyRound, Code2, UserRoundPlus, SlidersHorizontal, Check, LockKeyhole, CircleDollarSign } from 'lucide-react';
import { Reveal, MobileNavigation } from './landing-motion';

const CONSOLE = 'https://pay.axionenterprise.cloud/dashboard';
const DOCS = 'https://pay.axionenterprise.cloud/docs';

function Brand() {
  return <a className="brand" href="#inicio" aria-label="AXION Pay — início"><img src="/axion-logo.png" width="830" height="887" alt="" /><span>AXION<span className="brand-pay">pay</span></span></a>;
}

export default function Home() {
  return (
    <main id="inicio" className="pay-landing">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <section className="hero">
        <img className="hero-background" src="/money-hero.jpg" width="1920" height="1080" alt="" fetchPriority="high" />
        <div className="hero-shade" />
        <nav className="navigation container" aria-label="Navegação principal">
          <Brand />
          <div className="nav-links"><a href="#solucoes">Soluções</a><a href="#para-quem">Para quem é</a><a href="#como-comecar">Como começar</a></div>
          <div className="nav-actions"><a className="nav-login" href={CONSOLE}>Acessar conta <ArrowUpRight size={16}/></a><MobileNavigation/></div>
        </nav>
        <header id="conteudo" className="hero-content container">
          <div className="eyebrow animate-rise"><span className="status-dot"/> O PRÓXIMO NÍVEL DA SUA OPERAÇÃO</div>
          <h1 className="animate-rise">Suas vendas.<br/>Sem <span className="gradient-text">fronteiras.</span></h1>
          <p className="hero-description animate-rise">Do PIX ao cartão internacional. Receba em BRL e USD com a estrutura que acompanha o ritmo do seu negócio.</p>
          <div className="hero-actions animate-rise"><a className="button button-primary" href={CONSOLE}>Começar a vender <ArrowUpRight size={20}/></a><a className="button button-secondary" href="#solucoes">Conhecer a AXION <ArrowRight size={18}/></a></div>
          <div className="hero-trust animate-rise"><span><ShieldCheck size={15}/> Autenticação central AXION</span><span><Globe2 size={15}/> Brasil e mundo</span></div>
          <div className="hero-panels">
          <div className="payment-panel animate-rise">
            <div className="panel-top"><span className="panel-label">UMA CONEXÃO. MAIS POSSIBILIDADES.</span><span className="panel-tag"><span className="status-dot"/> AXION PAY</span></div>
            <div className="payment-options"><div><span className="payment-icon"><Zap/></span><div><strong>PIX</strong><span>Seu negócio no Brasil</span></div></div><div><span className="payment-icon"><CreditCard/></span><div><strong>Cartão internacional</strong><span>Seu negócio no mundo</span></div></div><div><span className="payment-icon currency-icon">$</span><div><strong>BRL / USD</strong><span>Mais de uma moeda</span></div></div></div>
            <div className="scan-track" aria-hidden="true"><span/></div>
          </div>
          <figure className="service-figure animate-rise" aria-label="Exemplo ilustrativo do painel de estado do serviço AXION">
            <div className="service-panel">
              <div className="service-heading"><span>ESTADO DO SERVIÇO</span><span className="service-operational"><span className="status-dot"/> OPERACIONAL</span></div>
              <div className="service-content">
                <div className="service-scan" aria-hidden="true"/>
                <div className="service-response">
                  <div className="service-response-heading"><span>POST /v1/charges</span><span>201 CREATED</span></div>
                  <code>{'{ "txid":"0x5f2a","status":"APROVADO","latency_ms":42 }'}</code>
                </div>
                <dl className="service-metrics">
                  <div><dt>API operacional</dt><dd><span/>99,98%</dd></div>
                  <div><dt>AXION Auth Central</dt><dd><span/>ativo</dd></div>
                  <div><dt>Chaves de merchant no console</dt><dd><span/>seguras</dd></div>
                  <div><dt>API autenticada e idempotente</dt><dd><span/>ok</dd></div>
                </dl>
              </div>
            </div>
            <figcaption>Visualização ilustrativa da integração AXION.</figcaption>
          </figure>
          </div>
        </header>
      </section>
      <div className="section-body">
        <section className="section container" id="para-quem" aria-labelledby="audience-title">
          <Reveal className="section-heading"><span className="section-kicker">DIFERENTES NEGÓCIOS. A MESMA AMBIÇÃO.</span><h2 id="audience-title">Para quem a <span className="gradient-text">AXION Pay serve?</span></h2><p>Seu mercado muda. Sua forma de receber acompanha.</p></Reveal>
          <div className="audience-grid">
            {[
              {icon:Flame,title:'Nicho hot',text:'Conteúdo exclusivo, creators e negócios digitais. Conecte seu público a uma forma simples de pagar.',tag:'CONTEÚDO & CREATORS'},
              {icon:Gamepad2,title:'iGaming',text:'Sua operação não para. Integre os pagamentos à experiência de quem joga e acompanhe cada cobrança.',tag:'JOGOS & ENTRETENIMENTO'},
              {icon:Layers,title:'Operações black e white',text:'Diferentes estratégias de venda, com uma estrutura de pagamentos para acompanhar o seu negócio.',tag:'PERFORMANCE & VENDAS'},
              {icon:Globe2,title:'Brasil e mundo',text:'Operações nacionais e internacionais. PIX no Brasil, cartão de crédito internacional e moedas BRL e USD.',tag:'NACIONAL & INTERNACIONAL'},
            ].map((item,i) => <Reveal delay={i*75} className="audience-card" key={item.title}><span className="card-icon"><item.icon size={25}/></span><h3>{item.title}</h3><p>{item.text}</p><span className="card-tag">{item.tag}</span></Reveal>)}
          </div>
        </section>
        <section className="section solutions container" id="solucoes" aria-labelledby="solutions-title">
          <Reveal className="section-heading"><span className="section-kicker">POR TRÁS DE CADA PAGAMENTO</span><h2 id="solutions-title">Você foca em vender.<br/><span className="gradient-text">A estrutura é AXION.</span></h2><p>Pagamentos conectados, acessos organizados e sua operação no controle.</p></Reveal>
          <div className="solution-grid">
            <Reveal className="solution-main">
              <div className="solution-copy"><span className="card-icon"><Code2 size={25}/></span><h3>Uma integração.<br/>Toda a sua operação.</h3><p>Crie e acompanhe cobranças pela API, com autenticação central e proteção contra duplicidade.</p><a href={DOCS} className="text-link">Conhecer a API <ArrowUpRight size={17}/></a></div>
              <div className="flow-visual" role="img" aria-label="Fluxo ilustrativo: autenticação AXION, processamento de cobrança e confirmação de pagamento.">
                <div className="flow-caption"><span>FLUXO DE PAGAMENTO</span><span>Ilustrativo</span></div>
                <div className="flow-auth"><span><LockKeyhole size={16}/> AXION Auth Central</span><ShieldCheck size={18}/></div>
                <div className="flow-connector" aria-hidden="true"><span/></div>
                <div className="transaction"><div className="transaction-scan" aria-hidden="true"/><div className="transaction-top"><span><Zap size={19}/> Cobrança PIX</span><span className="status-dot"/></div><div className="transaction-state"><span className="processing-state"><span className="loader"/> Processando pagamento</span><span className="approved-state"><span className="approved-icon"><Check size={13}/></span> Pagamento confirmado</span></div><div className="transaction-code">POST /v1/charges <span>API AXION</span></div></div>
                <div className="flow-caption flow-bottom"><span>DA CONEXÃO À CONFIRMAÇÃO</span><span><ShieldCheck size={13}/> Autenticado</span></div>
              </div>
            </Reveal>
            <div className="solution-side">
              <Reveal className="feature-card" delay={80}><span className="card-icon"><ShieldCheck size={24}/></span><div><h3>Um acesso. Controle central.</h3><p>Entre com a identidade AXION e gerencie sua operação em um só console.</p><span className="feature-label"><span className="status-dot"/> SSO AXION</span></div></Reveal>
              <Reveal className="feature-card" delay={160}><span className="card-icon"><KeyRound size={24}/></span><div><h3>Cada operação no seu lugar.</h3><p>Organize seus negócios por merchant, com chaves de acesso próprias e gestão individual.</p><span className="feature-label"><Layers size={13}/> GESTÃO POR MERCHANT</span></div></Reveal>
            </div>
          </div>
        </section>
        <section className="section start-section container" id="como-comecar" aria-labelledby="start-title">
          <Reveal className="section-heading"><span className="section-kicker">DO CADASTRO À PRIMEIRA VENDA</span><h2 id="start-title">Menos complicação.<br/><span className="gradient-text">Mais negócio acontecendo.</span></h2><p>Começar é simples. Sua próxima etapa já está aqui.</p></Reveal>
          <div className="start-grid">
            {[{icon:UserRoundPlus,title:'Cadastre sua operação',text:'Acesse sua conta AXION e preencha os dados do negócio que vai receber.'},{icon:SlidersHorizontal,title:'Conecte seus pagamentos',text:'Configure sua operação e faça a conexão dos pagamentos com seu site ou sistema.'},{icon:CircleDollarSign,title:'Comece a receber',text:'Com a operação habilitada, crie suas cobranças e acompanhe tudo pelo console.'}].map((item,i)=><Reveal className="start-card" delay={i*90} key={item.title}><span className="start-icon"><item.icon size={27}/></span>{i<2&&<span className="step-connection" aria-hidden="true"><ArrowRight size={18}/></span>}<h3>{item.title}</h3><p>{item.text}</p></Reveal>)}
          </div>
          <Reveal className="start-action"><a href={CONSOLE} className="button button-primary">Quero começar <ArrowUpRight size={20}/></a><span>Já tem uma conta? <a href={CONSOLE}>Acesse o console</a></span></Reveal>
        </section>
        <section className="container closing-section" aria-labelledby="closing-title"><Reveal className="closing-card"><div className="closing-glow" aria-hidden="true"/><span className="eyebrow"><span className="status-dot"/> SEU PRÓXIMO MOVIMENTO</span><h2 id="closing-title">Seu negócio vai além.<br/><span className="gradient-text">Seu pagamento também.</span></h2><p>PIX, cartão internacional, BRL e USD.<br/>Uma nova fase para a sua operação começa com AXION Pay.</p><div className="hero-actions"><a href={CONSOLE} className="button button-primary">Começar com a AXION <ArrowUpRight size={20}/></a><a href={DOCS} className="button button-secondary">Ver documentação <Code2 size={18}/></a></div><div className="scan-track" aria-hidden="true"><span/></div></Reveal></section>
        <footer className="footer container"><div className="footer-top"><Brand/><p>Conectando negócios.<br/>Movimentando possibilidades.</p><div className="footer-links"><a href="#para-quem">Para quem é</a><a href={DOCS}>Documentação <ArrowUpRight size={14}/></a><a href={CONSOLE}>Acessar conta <ArrowUpRight size={14}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} AXION Pay.</span><span>PIX · CARTÃO INTERNACIONAL · BRL / USD</span><a href="#inicio">Voltar ao topo ↑</a></div></footer>
      </div>
    </main>
  );
}
