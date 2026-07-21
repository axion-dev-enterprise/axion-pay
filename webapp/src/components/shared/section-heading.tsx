import { Badge } from '~/components/ui/badge'

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-3xl space-y-4">
      {eyebrow ? <Badge className="text-neon-300">{eyebrow}</Badge> : null}
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h2>
        <p className="font-body text-base leading-7 text-mist sm:text-lg">{description}</p>
      </div>
    </div>
  )
}

