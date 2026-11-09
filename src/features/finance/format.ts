import { formatPrice } from '@/lib/utils/format'

/** PKR rupees → "Rs 12,500" (negative as "−Rs 3,350"). */
export const pkr = (value: number) => {
  // Normalise -0 (e.g. a negated zero discount) so it never prints as "−Rs 0".
  const rupees = value || 0
  return rupees < 0 ? `−${formatPrice(Math.round(-rupees * 100))}` : formatPrice(Math.round(rupees * 100))
}

export const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)
