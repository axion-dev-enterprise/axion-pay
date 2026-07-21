import { LogOut, Wallet } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { appNav } from '~/config/navigation'
import { Button } from '~/components/ui/button'
import { logout } from '~/services/api/auth'
import { useSessionStore } from '~/store/session-store'

export function AppLayout() {
  const navigate = useNavigate()
  const user = useSessionStore((state) => state.user)
  const clearSession = useSessionStore((state) => state.clearSession)

  async function handleLogout() {
    await logout().catch(() => undefined)
    clearSession()
    navigate('/login')
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-r border-white/5 bg-surface/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon-500/15 shadow-glow">
            <Wallet className="h-5 w-5 text-neon-300" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-mist">AXION</div>
            <div className="text-base font-semibold text-white">PAY Control</div>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {appNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  isActive ? 'bg-neon-500/15 text-white shadow-glow' : 'text-mist hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">{user?.name || 'Operacao AXION'}</div>
          <div className="mt-1 text-xs text-mist">{user?.status || 'pending'}</div>
          <Button variant="ghost" className="mt-4 w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-white/5 bg-canvas/70 px-4 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-neon-300">Merchant panel</div>
              <h1 className="text-2xl font-semibold text-white">AXION-PAY Dashboard</h1>
            </div>
            <Button asChild variant="secondary">
              <a href="/docs">Ver docs</a>
            </Button>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
