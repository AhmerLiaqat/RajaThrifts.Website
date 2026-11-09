import { QueryClient } from '@tanstack/react-query'
import { ServiceError } from '@/services/core/errors'
import type { ProductFilters } from '@/types/product'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Don't retry errors that won't fix themselves; retry network blips once.
      retry: (count, error) => {
        if (!(error instanceof ServiceError)) return count < 2
        if (
          ['NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED', 'VALIDATION', 'NOT_CONFIGURED', 'OUT_OF_STOCK'].includes(
            error.code,
          )
        )
          return false
        return count < 1
      },
    },
  },
})

/** Centralised query keys, so cache invalidation stays consistent across features. */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => ['products', 'list', filters] as const,
    facets: (filters: ProductFilters) => ['products', 'facets', filters] as const,
    featured: ['products', 'featured'] as const,
    detail: (slug: string) => ['products', 'detail', slug] as const,
    related: (id: string) => ['products', 'related', id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    movements: (variantId: string) => ['inventory', 'movements', variantId] as const,
  },
  auth: { user: ['auth', 'user'] as const },
  profile: (id: string) => ['profile', id] as const,
  orders: {
    all: ['orders'] as const,
    mine: (userId: string) => ['orders', 'mine', userId] as const,
    detail: (orderNumber: string) => ['orders', 'detail', orderNumber] as const,
    admin: (filters: object) => ['orders', 'admin', filters] as const,
  },
  wishlist: {
    all: ['wishlist'] as const,
    ids: (userId: string) => ['wishlist', 'ids', userId] as const,
    products: (userId: string) => ['wishlist', 'products', userId] as const,
  },
  admin: {
    products: (filters: object) => ['admin', 'products', filters] as const,
    product: (id: string) => ['admin', 'product', id] as const,
    brands: ['admin', 'brands'] as const,
    categories: ['admin', 'categories'] as const,
    users: (search: string) => ['admin', 'users', search] as const,
  },
}
