import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden border-r border-white/5 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-[0.28em] text-neon-300">AXION-PAY</div>
          <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.05em] text-white">
            Gateway com UX premium para quem vende, integra e opera em escala.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-mist">
            PIX, cartao, checkout PRO, eventos e documentacao clara na mesma camada de produto.
          </p>
        </div>
        <div className="surface-panel max-w-xl space-y-3 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-neon-300">Credibilidade operacional</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-semibold text-white">99,95%</div>
              <div className="text-sm text-mist">uptime alvo</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">PIX + Cartao</div>
              <div className="text-sm text-mist">roteamento unificado</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">API-first</div>
              <div className="text-sm text-mist">pronto para squads</div>
            </div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  )
}

