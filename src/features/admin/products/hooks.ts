import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Collection } from '@/constants/collections'
import { queryKeys } from '@/lib/query/queryClient'
import { adminProductService, type ProductFormValues } from '@/services'
import type { AdminProductFilters } from '@/services/products/admin-product.service'
import type { ProductImage, ProductImageView, ProductStatus } from '@/types/product'

export const useAdminProducts = (filters: AdminProductFilters) =>
  useQuery({
    queryKey: queryKeys.admin.products(filters),
    queryFn: () => adminProductService.list(filters),
  })

export const useAdminProduct = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.admin.product(id ?? ''),
    queryFn: () => adminProductService.get(id!),
    enabled: !!id,
  })

export const useBrands = () =>
  useQuery({ queryKey: queryKeys.admin.brands, queryFn: adminProductService.listBrands })
export const useCategories = () =>
  useQuery({ queryKey: queryKeys.admin.categories, queryFn: adminProductService.listCategories })

/** Invalidates both back-office and storefront caches after a catalog change. */
function useCatalogInvalidation() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'products'] })
    qc.invalidateQueries({ queryKey: ['admin', 'product'] })
    qc.invalidateQueries({ queryKey: queryKeys.products.all })
  }
}

export function useSaveProduct() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: (v: ProductFormValues) => adminProductService.save(v),
    onSuccess: invalidate,
  })
}

export function useSetProductStatus() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      adminProductService.setStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteProduct() {
  const invalidate = useCatalogInvalidation()
  return useMutation({
    mutationFn: (p: { id: string; images: ProductImage[] }) => adminProductService.remove(p),
    onSuccess: invalidate,
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => adminProductService.createBrand(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.brands }),
  })
}

export function useImageMutations(productId: string) {
  const invalidate = useCatalogInvalidation()
  const upload = useMutation({
    mutationFn: ({
      file,
      view,
      alt,
      position,
    }: {
      file: File
      view: ProductImageView
      alt: string
      position: number
    }) => adminProductService.addImage(productId, file, view, alt, position),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: { view?: ProductImageView; alt?: string; position?: number }
    }) => adminProductService.updateImage(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (image: ProductImage) => adminProductService.removeImage(image),
    onSuccess: invalidate,
  })
  return { upload, update, remove }
}

export function useBulkUpdateProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ids,
      patch,
    }: {
      ids: string[]
      patch: { collection?: Collection; status?: ProductStatus }
    }) => adminProductService.bulkUpdate(ids, patch),
    onSuccess: () => {
      for (const key of [['admin'], queryKeys.products.all, ['dashboard']])
        qc.invalidateQueries({ queryKey: key })
    },
  })
}
