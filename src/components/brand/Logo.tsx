import { cn } from '@/lib/utils/cn'

/**
 * Raja Thrifts brand assets. The artwork lives in /public/brand (exported from the logo pack),
 * so the website always shows exactly the same logo as social media and print.
 */
const SRC = {
  icon: '/brand/raja-thrifts-icon.svg',
  horizontalLight: '/brand/raja-thrifts-logo-horizontal-light.svg',
  horizontalDark: '/brand/raja-thrifts-logo-horizontal-dark.svg',
  wordmarkDark: '/brand/raja-thrifts-wordmark-dark.svg',
} as const

/** Round badge icon: crown over a sneaker. Use where space is tight. */
export function LogoMark({ className, title = 'Raja Thrifts' }: { className?: string; title?: string }) {
  return (
    <img
      src={SRC.icon}
      alt={title}
      aria-hidden={title ? undefined : true}
      width={40}
      height={40}
      decoding="async"
      className={cn('size-10 shrink-0 select-none', className)}
    />
  )
}

/**
 * Horizontal logo: badge icon + RAJA / THRIFTS wordmark.
 * `tone="light"` for white backgrounds, `tone="dark"` for dark backgrounds.
 */
export function Logo({
  className,
  tone = 'light',
  size = 'md',
}: {
  className?: string
  tone?: 'light' | 'dark'
  /** Kept for compatibility; the artwork already includes its tagline treatment. */
  tagline?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <img
      src={tone === 'dark' ? SRC.horizontalDark : SRC.horizontalLight}
      alt="Raja Thrifts"
      width={869}
      height={300}
      decoding="async"
      className={cn(
        'w-auto shrink-0 select-none',
        size === 'sm' ? 'h-9' : size === 'lg' ? 'h-16' : 'h-12 sm:h-14',
        className,
      )}
    />
  )
}

/** Text-only wordmark for dark surfaces (admin sidebar). */
export function LogoWordmarkDark({ className }: { className?: string }) {
  return (
    <img
      src={SRC.wordmarkDark}
      alt="Raja Thrifts"
      width={531}
      height={290}
      decoding="async"
      className={cn('h-9 w-auto select-none', className)}
    />
  )
}
