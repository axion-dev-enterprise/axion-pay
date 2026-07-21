import { useSessionStore } from '~/store/session-store'
import { Card } from '~/components/ui/card'

export function SettingsPage() {
  const user = useSessionStore((state) => state.user)

  return (
    <Card>
      <h2 className="text-xl font-semibold text-white">Merchant settings</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-sm text-mist">Nome</div>
          <div className="mt-2 text-base text-white">{user?.name || 'Sem nome'}</div>
        </div>
        <div>
          <div className="text-sm text-mist">E-mail</div>
          <div className="mt-2 text-base text-white">{user?.email || 'Sem e-mail'}</div>
        </div>
        <div>
          <div className="text-sm text-mist">Status</div>
          <div className="mt-2 text-base text-white">{user?.status || 'pending'}</div>
        </div>
        <div>
          <div className="text-sm text-mist">Empresa</div>
          <div className="mt-2 text-base text-white">{user?.company || 'Cliente AxionPay'}</div>
        </div>
      </div>
    </Card>
  )
}

