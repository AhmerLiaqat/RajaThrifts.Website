import type { ReactNode } from 'react'
import { MaskedText } from '@/components/motion/MaskedText'
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
  const light = tone === 'light'
  return (
    <div
      className={cn(
        'flex flex-col gap-8',
        align === 'split' && 'lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="max-w-3xl">
        <Reveal className="mb-5 flex items-center gap-4">
          {index && (
            <span
              className={cn('font-display text-xs tabular-nums', light ? 'text-night/50' : 'text-ink-subtle')}
            >
              {index}
            </span>
          )}
          <span className={cn('h-px w-10', light ? 'bg-night/30' : 'bg-sand/50')} aria-hidden />
          <span className={cn('eyebrow', light && 'text-sand-700')}>{eyebrow}</span>
        </Reveal>
        <h2
          className={cn(
            'text-[clamp(2.5rem,7vw,6rem)] leading-[0.92] font-semibold uppercase',
            light ? 'text-night' : 'text-bone',
          )}
        >
          <MaskedText
            lines={[
              { text: title },
              ...(outline
                ? [{ text: outline, className: cn('hollow', light ? 'text-night/70' : 'text-sand') }]
                : []),
            ]}
          />
        </h2>
      </div>

      {(description || action) && (
        <Reveal delay={0.15} className="flex max-w-sm flex-col items-start gap-6">
          {description && (
            <p className={cn('text-sm leading-relaxed', light ? 'text-night/70' : 'text-ink-muted')}>
              {description}
            </p>
          )}
          {action}
        </Reveal>
      )}
    </div>
  )
}
