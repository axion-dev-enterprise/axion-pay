import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

export function PixPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="PIX"
          title="Cobrancas instantaneas com UX clara, estados fortes e leitura operacional."
          description="O frontend do AXION-PAY prioriza emissao rapida, instrucoes nítidas e comportamento seguro para expiracao e confirmacao."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['Payload e QR', 'Suporte a payload copia e cola, QR base64 e expiracao vinda do backend.'],
            ['Polling elegante', 'Consulta de status sem travar a interface e com mensagens confiaveis.'],
            ['Operacao white/black', 'Pronto para roteamento por pay-tag e modo operacional.'],
          ].map(([title, text]) => (
            <Card key={title}>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-mist">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

