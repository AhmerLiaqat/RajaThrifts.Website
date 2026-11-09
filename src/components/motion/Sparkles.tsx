import { cn } from '@/lib/utils/cn'

/** A four-point sparkle glyph. */
export function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 0c.6 5.6 2.4 9.6 12 12-9.6 2.4-11.4 6.4-12 12-.6-5.6-2.4-9.6-12-12 9.6-2.4 11.4-6.4 12-12Z" />
    </svg>
  )
}

/** Small deterministic PRNG so sparkle positions are stable between renders. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * A field of twinkling sparkles, absolutely positioned inside its parent.
 * Purely decorative; animation stops under prefers-reduced-motion.
 */
export function Sparkles({
  count = 14,
  seed = 7,
  className,
}: {
  count?: number
  seed?: number
  className?: string
}) {
  const rand = seeded(seed)
  const items = Array.from({ length: count }, () => ({
    top: rand() * 100,
    left: rand() * 100,
    size: 6 + rand() * 12,
    delay: rand() * 4,
    duration: 2.4 + rand() * 2.6,
    gold: rand() > 0.4,
  }))
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      {items.map((s, i) => (
        <SparkleIcon
          key={i}
          className={cn(
            'absolute animate-twinkle drop-shadow-[0_0_6px_currentColor]',
            s.gold ? 'text-sand' : 'text-bone',
          )}
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Fixed night-sky backdrop for the storefront: aurora glows, star dust and a few sparkles. */
export function SkyBackdrop() {
  return (
    <div aria-hidden className="sky pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="stars" />
      <div className="stars-twinkle" />
      <Sparkles count={10} seed={42} className="opacity-60" />
    </div>
  )
}
