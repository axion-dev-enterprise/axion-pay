import { Badge } from '~/components/ui/badge'

const statusClasses: Record<string, string> = {
  paid: 'border-alert-success/30 bg-alert-success/15 text-alert-success',
  active: 'border-alert-success/30 bg-alert-success/15 text-alert-success',
  authorized: 'border-aqua-400/30 bg-aqua-400/15 text-aqua-300',
  connected: 'border-alert-success/30 bg-alert-success/15 text-alert-success',
  pending: 'border-alert-warning/30 bg-alert-warning/15 text-alert-warning',
  pending_payment: 'border-alert-warning/30 bg-alert-warning/15 text-alert-warning',
  processing: 'border-aqua-400/30 bg-aqua-400/15 text-aqua-300',
  disconnected: 'border-white/10 bg-white/5 text-mist',
  invalid: 'border-alert-danger/30 bg-alert-danger/15 text-alert-danger',
  failed: 'border-alert-danger/30 bg-alert-danger/15 text-alert-danger',
  canceled: 'border-alert-danger/30 bg-alert-danger/15 text-alert-danger',
  expired: 'border-alert-danger/30 bg-alert-danger/15 text-alert-danger',
  refunded: 'border-aqua-400/30 bg-aqua-400/15 text-aqua-300',
}

export function StatusBadge({ value }: { value: string }) {
  return <Badge className={statusClasses[value] || ''}>{value.replace(/_/g, ' ')}</Badge>
}

