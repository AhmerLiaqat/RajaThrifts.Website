import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { brandService, sizeService, type SizeInput } from '@/services/dashboard/dashboard.service'

const KEYS = {
  brands: ['admin', 'brands', 'counts'] as const,
  sizes: ['admin', 'sizes'] as const,
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

/** Size chart (public read). Used by the product editor and the sizes page. */
export const useSizeChart = () =>
  useQuery({ queryKey: KEYS.sizes, queryFn: sizeService.list, staleTime: 5 * 60_000 })

export function useSizeMutations() {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: KEYS.sizes })
  return {
    create: useMutation({ mutationFn: (s: SizeInput) => sizeService.create(s), onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; size: SizeInput }) => sizeService.update(v.id, v.size),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => sizeService.remove(id), onSuccess: done }),
  }
}
