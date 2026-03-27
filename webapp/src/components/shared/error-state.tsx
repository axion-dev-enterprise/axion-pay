import { AlertTriangle } from 'lucide-react'
import { Card } from '~/components/ui/card'

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-alert-danger/30 bg-alert-danger/10">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-alert-danger" />
        <div>
          <h3 className="font-semibold text-white">Fluxo com erro</h3>
          <p className="mt-1 text-sm text-mist">{message}</p>
        </div>
      </div>
    </Card>
  )
}
