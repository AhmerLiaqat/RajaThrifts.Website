/**
 * EU ↔ UK shoe size helpers for the storefront.
 *
 * Sizes are stored in EU. The UK equivalent comes from the staff-managed size chart
 * (public.shoe_sizes); this default mirrors the chart seeded by the migrations so
 * customers still see UK sizes in demo mode or before the chart has loaded.
 */
export const DEFAULT_EU_TO_UK: Readonly<Record<string, string>> = {
  '36': '3.5',
  '37': '4.5',
  '38': '5',
  '39': '6',
  '40': '6.5',
  '41': '7.5',
  '42': '8',
  '43': '9',
  '44': '9.5',
  '45': '10.5',
  '46': '11',
  '47': '12',
}

/** "42.0" → "42", "42.50" → "42.5". Leaves non-numeric values untouched. */
export function normalizeSize(value: string | number): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : String(value).trim()
}

export interface SizeConversions {
  /** UK equivalent of an EU size, or null when the chart has none. */
  uk: (eu: string) => string | null
  /** "EU 42 · UK 8" (or "EU 42" when no UK size is known). */
  label: (eu: string, separator?: string) => string
}

export function buildSizeConversions(map: ReadonlyMap<string, string>): SizeConversions {
  const uk = (eu: string) => map.get(normalizeSize(eu)) ?? null
  return {
    uk,
    label: (eu, separator = ' · ') => {
      const u = uk(eu)
      return u ? `EU ${normalizeSize(eu)}${separator}UK ${u}` : `EU ${normalizeSize(eu)}`
    },
  }
}

export const defaultSizeConversions = buildSizeConversions(new Map(Object.entries(DEFAULT_EU_TO_UK)))
