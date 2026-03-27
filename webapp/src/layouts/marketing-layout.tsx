import { Menu, Wallet } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { marketingNav } from '~/config/navigation'
import { Button } from '~/components/ui/button'

export function MarketingLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-canvas/80 backdrop-blur-xl">
        <div className="page-wrap flex h-18 items-center justify-between gap-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon-500/15 shadow-glow">
              <Wallet className="h-5 w-5 text-neon-300" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-mist">AXION</div>
              <div className="text-base font-semibold text-white">PAY</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {marketingNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-white' : 'text-mist hover:text-white'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Button asChild variant="ghost">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Criar conta</Link>
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="sm:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="page-wrap flex flex-col gap-4 text-sm text-mist md:flex-row md:items-center md:justify-between">
          <p>AXION-PAY. Gateway para PIX, cartao, checkout PRO e operacao API-first.</p>
          <div className="flex gap-4">
            <Link to="/docs" className="hover:text-white">
              Docs
            </Link>
            <Link to="/precos" className="hover:text-white">
              Precos
            </Link>
            <Link to="/contato" className="hover:text-white">
              Contato
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

