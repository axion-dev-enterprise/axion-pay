export function formatCurrency(value = 0, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCompactCurrency(value = 0) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatNumber(value = 0) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value = 0) {
  return `${value.toFixed(1).replace('.', ',')}%`
}

export function formatDate(value?: string | null) {
  if (!value) return 'Sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data invalida'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function maskSecret(value: string, visible = 4) {
  if (!value) return ''
  if (value.length <= visible) return value
  return `${'*'.repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`
}
