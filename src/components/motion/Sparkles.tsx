
/** A four-point sparkle glyph. */
export function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 0c.6 5.6 2.4 9.6 12 12-9.6 2.4-11.4 6.4-12 12-.6-5.6-2.4-9.6-12-12 9.6-2.4 11.4-6.4 12-12Z" />
    </svg>
  )
}

/**
 * Decorative sparkle field. Retired with the light theme (kept so existing imports compile).
 */
export function Sparkles(_props: { count?: number; seed?: number; className?: string }) {
  return null
}

/** Storefront backdrop. The light theme uses a plain surface, so this renders nothing. */
export function SkyBackdrop() {
  return null
}
