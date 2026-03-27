import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '~/components/shared/empty-state'
import { TransactionTable } from '~/components/app/transaction-table'
import { getPayments } from '~/services/api/payments'
import { getActiveApiKeyValue } from '~/store/session-store'

export function TransactionsPage() {
  const apiKey = getActiveApiKeyValue()
  const paymentsQuery = useQuery({
    queryKey: ['payments', apiKey],
    queryFn: () => getPayments(apiKey),
    enabled: Boolean(apiKey),
  })

  if (!apiKey) {
    return (
      <EmptyState
        title="Nenhuma API key selecionada"
        description="Crie ou selecione uma API key valida para consumir /payments e listar transacoes reais."
      />
    )
  }

  return paymentsQuery.data?.items?.length ? (
    <TransactionTable items={paymentsQuery.data.items} />
  ) : (
    <EmptyState
      title="Sem transacoes"
      description="A consulta em /payments nao retornou itens para a API key ativa."
    />
  )
}

