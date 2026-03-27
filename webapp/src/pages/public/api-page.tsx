import { docSections } from '~/config/marketing'
import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

export function ApiPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="API"
          title="API-first com contratos claros, adapters no frontend e espaco para evolucao real."
          description="O frontend foi reorganizado para consumir o backend atual sem acoplar a UI ao shape bruto das respostas."
        />
        <div className="grid gap-6">
          {docSections.map((section) => (
            <Card key={section.id}>
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-mist">{section.summary}</p>
              {section.code ? (
                <pre className="mt-5 overflow-x-auto rounded-3xl bg-[#03100c] p-4 font-mono text-xs text-neon-200">
                  <code>{section.code}</code>
                </pre>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

