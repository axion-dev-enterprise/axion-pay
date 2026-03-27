import { useQuery } from '@tanstack/react-query'
import { docSections } from '~/config/marketing'
import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'
import { getOpenApiSpec } from '~/services/api/docs'

export function DocsPage() {
  const specQuery = useQuery({
    queryKey: ['openapi-spec'],
    queryFn: getOpenApiSpec,
  })

  return (
    <div className="section-space">
      <div className="page-wrap grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="surface-panel h-fit p-5">
          <div className="text-sm uppercase tracking-[0.22em] text-neon-300">Documentacao</div>
          <nav className="mt-5 space-y-2 text-sm text-mist">
            {docSections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="block rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">
                {section.title}
              </a>
            ))}
            <a href="#openapi" className="block rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white">
              OpenAPI bruto
            </a>
          </nav>
        </aside>

        <div className="space-y-8">
          <SectionHeading
            eyebrow="Docs"
            title="Experiencia de documentacao mais clara para devs e operacao."
            description="A documentacao agora destaca onboarding rapido, exemplos copiados do contrato atual e gaps reais entre frontend e backend."
          />
          {docSections.map((section) => (
            <Card key={section.id} id={section.id}>
              <h3 className="text-xl font-semibold text-white">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-mist">{section.summary}</p>
              {section.code ? (
                <pre className="mt-5 overflow-x-auto rounded-3xl bg-[#03100c] p-4 font-mono text-xs text-neon-200">
                  <code>{section.code}</code>
                </pre>
              ) : null}
            </Card>
          ))}
          <Card id="openapi">
            <h3 className="text-xl font-semibold text-white">OpenAPI atual</h3>
            <p className="mt-3 text-sm text-mist">
              Especificacao existente do backend. Hoje cobre principalmente payments e webhooks.
            </p>
            <pre className="mt-5 max-h-[420px] overflow-auto rounded-3xl bg-[#03100c] p-4 font-mono text-xs text-neon-200">
              <code>{specQuery.data || 'Carregando especificacao...'}</code>
            </pre>
          </Card>
        </div>
      </div>
    </div>
  )
}

