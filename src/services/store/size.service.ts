import { getSupabase } from '@/lib/supabase/client'
import { normalizeSize } from '@/lib/utils/sizes'
import { unwrap } from '../core/errors'

export interface SizeConversionRow {
  eu: string
  uk: string | null
}

/** Public, read-only view of the size chart for the storefront (EU → UK). */
export const sizeChartService = {
  async conversions(): Promise<SizeConversionRow[]> {
    const rows = unwrap<Array<{ eu: number | string; uk: number | string | null }>>(
      await getSupabase().from('shoe_sizes').select('eu, uk').order('eu'),
    )
    return rows.map((r) => ({ eu: normalizeSize(r.eu), uk: r.uk == null ? null : normalizeSize(r.uk) }))
  },
}
