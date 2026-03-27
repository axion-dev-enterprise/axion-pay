import { docSections } from '~/config/marketing'
import { Card } from '~/components/ui/card'

export function DocumentationPage() {
  return (
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
  )
}
