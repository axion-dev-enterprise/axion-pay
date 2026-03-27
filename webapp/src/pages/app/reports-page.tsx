import { Card } from '~/components/ui/card'

export function ReportsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="text-lg font-semibold text-white">Resumo operacional</h3>
        <p className="mt-3 text-sm leading-7 text-mist">
          O frontend foi preparado para crescimento em relatorios com filtros, exportacoes e timeline financeira.
        </p>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold text-white">Diagnostico de gaps</h3>
        <p className="mt-3 text-sm leading-7 text-mist">
          Webhook logs, assinaturas e analytics detalhados ainda dependem de endpoints adicionais ou exposicao de dados hoje internos.
        </p>
      </Card>
    </div>
  )
}

