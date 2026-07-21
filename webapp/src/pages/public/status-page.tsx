import { useQuery } from '@tanstack/react-query'
import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

async function getHealth() {
  const response = await fetch('/health')
  return response.json()
}

export function StatusPage() {
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: getHealth })

  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="Status"
          title="Painel simples de saude publica do gateway."
          description="Usa o endpoint real de health para expor ambiente, uptime e timestamp."
        />
        <Card>
          <pre className="overflow-x-auto rounded-3xl bg-[#03100c] p-4 font-mono text-sm text-neon-200">
            <code>{JSON.stringify(healthQuery.data || { loading: true }, null, 2)}</code>
          </pre>
        </Card>
      </div>
    </div>
  )
}
