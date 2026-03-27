import type { ReactNode } from 'react'
import { Card } from '~/components/ui/card'

export function KpiCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string
  value: string
  helper: string
  icon: ReactNode
}) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="text-sm text-mist">{label}</div>
          <div className="text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
          <div className="text-sm text-mist">{helper}</div>
        </div>
        <div className="rounded-2xl bg-neon-500/12 p-3 text-neon-300">{icon}</div>
      </div>
    </Card>
  )
}

