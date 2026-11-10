import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { catalogService } from '@/services'
import type { ProductSummary } from '@/types/product'

/** Pairs added within this many days get a "New" badge. */
const NEW_DAYS = 14

/**
 * Everything the homepage shows comes from the live catalog (Supabase), newest first,
 * or the demo catalog when VITE_USE_DEMO_CATALOG=true / Supabase is not configured.
 */
export function useHomeProducts() {
  const query = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => catalogService.list({ pageSize: 200, sortBy: 'createdAt', sortDirection: 'desc' }),
    staleTime: 60_000,
  })
  const items: ProductSummary[] = query.data?.items ?? []
  return {
    ...query,
    items,
    isDemo: env.useDemoCatalog,
    isNew: (p: ProductSummary) => Date.now() - Date.parse(p.createdAt) <= NEW_DAYS * 86_400_000,
  }
}
