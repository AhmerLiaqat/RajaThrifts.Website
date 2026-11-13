import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { env } from '@/config/env'
import { buildSizeConversions, DEFAULT_EU_TO_UK, type SizeConversions } from '@/lib/utils/sizes'
import { sizeChartService } from '@/services/store/size.service'

export const SIZE_CHART_QUERY_KEY = ['size-chart', 'public'] as const

/**
 * EU → UK conversions from the staff-managed size chart. Falls back to the default
 * chart in demo mode, while loading, or if the request fails, so UK sizes always show.
 */
export function useSizeConversions(): SizeConversions {
  const chart = useQuery({
    queryKey: SIZE_CHART_QUERY_KEY,
    queryFn: sizeChartService.conversions,
    enabled: env.isSupabaseConfigured,
    staleTime: 30 * 60_000,
  })

  return useMemo(() => {
    const map = new Map(Object.entries(DEFAULT_EU_TO_UK))
    for (const row of chart.data ?? []) {
      if (row.uk) map.set(row.eu, row.uk)
      else map.delete(row.eu)
    }
    return buildSizeConversions(map)
  }, [chart.data])
}
