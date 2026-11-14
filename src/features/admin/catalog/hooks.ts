import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brandService } from '@/services/dashboard/dashboard.service'

const KEYS = {
  brands: ['admin', 'brands', 'counts'] as const,
}

export const useBrandsWithCounts = () => useQuery({ queryKey: KEYS.brands, queryFn: brandService.list })

export function useBrandMutations() {
  const qc = useQueryClient()
  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'brands'] })
    qc.invalidateQueries({ queryKey: ['products'] })
  }
  return {
    create: useMutation({ mutationFn: (name: string) => brandService.create(name), onSuccess: done }),
    rename: useMutation({
      mutationFn: (v: { id: string; name: string }) => brandService.rename(v.id, v.name),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => brandService.remove(id), onSuccess: done }),
  }
}
