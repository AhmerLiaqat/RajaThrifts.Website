import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

const tones = {
  neutral: 'bg-surface-sunken text-ink-muted',
  accent: 'bg-sand/15 text-sand',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof tones
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
