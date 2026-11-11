/** Minimal brand glyphs (lucide 1.x has no brand icons). Decorative: pair them with a text label. */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 3c.3 2.3 1.6 3.9 3.9 4.1v3.1c-1.4.1-2.7-.3-3.9-1v6.3c0 3.6-2.6 6.1-6 6.1-3.3 0-5.9-2.5-5.9-5.8 0-3.6 3-6.2 6.7-5.7v3.2c-1.7-.4-3.4.7-3.4 2.5 0 1.4 1.1 2.6 2.6 2.6 1.6 0 2.7-1.2 2.7-3V3h3.3Z" />
    </svg>
  )
}
