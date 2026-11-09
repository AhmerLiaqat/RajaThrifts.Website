import { cn } from '@/lib/utils/cn'

const variants = {
  primary: 'bg-bone text-night hover:bg-sand',
  accent: 'bg-sand text-night hover:bg-sand-300',
  outline: 'border border-bone/30 bg-transparent text-bone hover:border-bone hover:bg-bone hover:text-night',
  ghost: 'bg-transparent text-ink hover:bg-bone/5',
  dark: 'bg-night text-bone hover:bg-carbon',
  danger: 'bg-danger text-night hover:bg-danger/90',
} as const

const sizes = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-12 px-6 text-xs',
  lg: 'h-14 px-8 text-sm',
  icon: 'h-10 w-10',
} as const

export type Variant = keyof typeof variants
export type Size = keyof typeof sizes

/** Shared class builder so <Button> and <ButtonLink> look identical. */
export const buttonClasses = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(
    'group/btn inline-flex items-center justify-center gap-2 rounded-full font-display font-medium tracking-[0.18em] uppercase',
    'transition-[background-color,color,border-color,transform] duration-300 ease-out-expo active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
