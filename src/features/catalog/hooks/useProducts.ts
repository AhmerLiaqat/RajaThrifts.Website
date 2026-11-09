import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryClient'
import { catalogService } from '@/services'
import type { Product, ProductFilters } from '@/types/product'

/** Product grid. Keeps the previous results visible while new filters load (no flashing). */
export const useProducts = (filters: ProductFilters = {}) =>
  useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => catalogService.list(filters),
    placeholderData: keepPreviousData,
  })

/** Filter options and counts for the current filter state. */
export const useProductFacets = (filters: ProductFilters = {}) =>
  useQuery({
    queryKey: queryKeys.products.facets(filters),
    queryFn: () => catalogService.getFacets(filters),
    placeholderData: keepPreviousData,
  })

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: queryKeys.products.featured,
    queryFn: () => catalogService.listFeatured(),
  })

export const useProduct = (slug: string | undefined) =>
  useQuery({
    queryKey: queryKeys.products.detail(slug ?? ''),
    queryFn: () => catalogService.getBySlug(slug!),
    enabled: Boolean(slug),
  })

export const useRelatedProducts = (product: Product | undefined, limit = 4) =>
  useQuery({
    queryKey: queryKeys.products.related(product?.id ?? ''),
    queryFn: () => catalogService.listRelated(product!, limit),
    enabled: Boolean(product),
  })
