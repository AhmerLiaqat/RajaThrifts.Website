import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { SparkleIcon } from '@/components/motion/Sparkles'
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
        'flex flex-col gap-6',
        center ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <Reveal className={cn('max-w-3xl', center && 'flex flex-col items-center')}>
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-[11px] font-medium tracking-[0.28em] text-sand uppercase">
          <SparkleIcon className="size-3" />
          {eyebrow}
        </span>
        <h2
          id={id}
          className="mt-5 text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1] font-semibold tracking-[-0.03em]"
        >
          {title} {highlight && <span className="text-gold">{highlight}</span>}
        </h2>
        {description && center && (
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted">{description}</p>
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
