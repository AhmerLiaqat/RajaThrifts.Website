import type { ReactNode } from 'react'
import { Container } from '@/components/ui'

/** Temporary page body used by scaffolded routes until each phase implements them. */
export function PagePlaceholder({
  title,
  phase,
  children,
}: {
  title: string
  phase: number
  children?: ReactNode
}) {
  return (
    <Container className="py-16">
      <p className="text-xs font-semibold tracking-widest text-sand uppercase">Phase {phase}</p>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <div className="mt-4 text-ink-muted">{children ?? 'Scaffolded route. Not implemented yet.'}</div>
    </Container>
  )
}
