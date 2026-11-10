import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/utils/cn'

/** Shared homepage section heading: sparkle pill, title with a gold word, optional copy and action. */
export function HomeHeading({
  id,
  eyebrow,
  title,
  highlight,
  description,
  action,
  center = false,
  className,
}: {
  id?: string
  eyebrow: string
  title: string
  /** Rendered after the title in champagne-gold gradient. */
  highlight?: string
  description?: ReactNode
  action?: ReactNode
  center?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        center ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <Reveal className={cn('max-w-3xl', center && 'flex flex-col items-center')}>
        <span className="eyebrow">{eyebrow}</span>
        <h2
          id={id}
          className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight font-bold tracking-tight text-ink"
        >
          {title} {highlight && <span className="text-sand">{highlight}</span>}
        </h2>
        {description && center && (
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">{description}</p>
        )}
      </Reveal>
      {((description && !center) || action) && (
        <Reveal delay={0.1} className={cn('flex max-w-sm flex-col gap-5', center ? 'items-center' : 'items-start')}>
          {description && !center && <p className="text-sm leading-relaxed text-ink-muted">{description}</p>}
          {action}
        </Reveal>
      )}
    </div>
  )
}
