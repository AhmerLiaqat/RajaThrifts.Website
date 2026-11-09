import type { MinorUnits } from '@/types/common'
import type { NumericPkr } from '@/types/database'

/**
 * The database stores PKR as numeric(12,2) rupees; the app works in integer paisa.
 * These are the only two places that cross that boundary.
 */
export const pkrToMinor = (value: NumericPkr): MinorUnits => Math.round(Number(value) * 100)

export const pkrToMinorOrNull = (value: NumericPkr | null | undefined): MinorUnits | null =>
  value === null || value === undefined ? null : pkrToMinor(value)

/** Paisa → "1234.50" string for numeric columns (strings avoid float drift in JSON). */
export const minorToPkr = (value: MinorUnits): string => (Math.round(value) / 100).toFixed(2)
