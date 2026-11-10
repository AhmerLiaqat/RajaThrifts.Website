import { cn } from '@/lib/utils/cn'

const variants = {
  primary: 'bg-bone text-white shadow-sm hover:bg-bone/90',
  accent: 'bg-sand text-white shadow-sm hover:bg-sand-600',
  outline: 'border border-line-strong bg-surface-raised text-ink shadow-sm hover:border-ink-subtle hover:bg-surface-sunken',
  ghost: 'bg-transparent text-ink hover:bg-surface-sunken',
  dark: 'bg-brand-navy text-white hover:bg-sand-700',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger/90',
} as const

const sizes = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
} as const

export type Variant = keyof typeof variants
export type Size = keyof typeof sizes

/** Shared class builder so <Button> and <ButtonLink> look identical. */
export const buttonClasses = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(
    'group/btn inline-flex items-center justify-center gap-2 rounded-lg font-sans font-semibold whitespace-nowrap',
    'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
