import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/utils/cn'

interface SectionHeadingProps {
  index?: string
  eyebrow: string
  title: string
  /** Optional second title line, rendered in outline. */
  outline?: string
  description?: ReactNode
  action?: ReactNode
  align?: 'left' | 'split'
  tone?: 'dark' | 'light'
  className?: string
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  outline,
  description,
  action,
  align = 'split',
  tone = 'dark',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'split' && 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <Reveal className="max-w-3xl">
        <span className={cn('eyebrow', tone === 'light' && 'text-sand-700')}>
          {index && <span className="mr-2 text-ink-subtle tabular-nums">{index}</span>}
          {eyebrow}
        </span>
        <h2 className="mt-2 text-[clamp(1.5rem,3vw,2.25rem)] leading-tight font-bold tracking-tight text-ink">
          {title}
          {outline && <span className="text-sand"> {outline}</span>}
        </h2>
      </Reveal>

      {(description || action) && (
        <Reveal delay={0.05} className="flex max-w-sm flex-col items-start gap-4">
          {description && <p className="text-sm leading-relaxed text-ink-muted">{description}</p>}
          {action}
        </Reveal>
      )}
    </div>
  )
}
