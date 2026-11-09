import { getSupabase } from '@/lib/supabase/client'
import type { Paginated } from '@/types/common'
import type { ProductWithRelationsRow } from '@/types/database'
import type { Product, ProductFacets, ProductFilters, ProductSummary } from '@/types/product'
import { fromPostgrestError, unwrap } from '../core/errors'
import { mapProduct, PRODUCT_SELECT } from './product.mappers'
import { computeFacets, filterProducts, relatedTo, sortProducts, toSummary } from './product.query'

export const DEFAULT_PAGE_SIZE = 24

/**
 * Public contract of the product data source.
 * Hooks depend on this interface, so the backend can be swapped (demo ↔ Supabase) or mocked in tests.
 */
export interface ProductService {
  list(filters?: ProductFilters): Promise<Paginated<ProductSummary>>
  getFacets(filters?: ProductFilters): Promise<ProductFacets>
  getBySlug(slug: string): Promise<Product>
  getById(id: string): Promise<Product>
  listFeatured(limit?: number): Promise<ProductSummary[]>
  listRelated(product: Product, limit?: number): Promise<ProductSummary[]>
  // Admin write operations (create, update, archive, uploadImage) arrive in Phase 4.
}

export const paginate = <T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Paginated<T> => {
  const from = (page - 1) * pageSize
  return { items: items.slice(from, from + pageSize), total: items.length, page, pageSize }
}

/**
 * Loads the public catalog (optionally one collection). Thrift catalogs are hundreds
 * of pairs, not millions, so search, size/availability filters, facets and sorting
 * reuse the shared pure query module (identical behaviour to the demo catalog,
 * and search can match brand names, which live in a joined table).
 * Revisit with a view/RPC + pagination in SQL if the catalog grows past a few thousand.
 */
async function loadScope(f: Pick<ProductFilters, 'collection'>): Promise<Product[]> {
  let query = getSupabase().from('products').select(PRODUCT_SELECT).in('status', ['active', 'sold_out'])
  if (f.collection) query = query.eq('collection', f.collection)
  const { data, error } = await query
  if (error) throw fromPostgrestError(error)
  return (data as ProductWithRelationsRow[]).map(mapProduct)
}

export const productService: ProductService = {
  async list(filters = {}) {
    const scope = await loadScope(filters)
    const rows = sortProducts(filterProducts(scope, filters), filters)
    return paginate(rows.map(toSummary), filters.page, filters.pageSize)
  },

  async getFacets(filters = {}) {
    const scope = await loadScope(filters)
    return computeFacets(scope, filters)
  },

  async getBySlug(slug) {
    const row = unwrap<ProductWithRelationsRow>(
      await getSupabase().from('products').select(PRODUCT_SELECT).eq('slug', slug).single(),
    )
    return mapProduct(row)
  },

  async getById(id) {
    const row = unwrap<ProductWithRelationsRow>(
      await getSupabase().from('products').select(PRODUCT_SELECT).eq('id', id).single(),
    )
    return mapProduct(row)
  },

  async listFeatured(limit = 8) {
    const { data, error } = await getSupabase()
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'active')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw fromPostgrestError(error)
    return (data as ProductWithRelationsRow[]).map(mapProduct).map(toSummary)
  },

  async listRelated(product, limit = 4) {
    const scope = await loadScope({})
    return relatedTo(product, scope, limit).map(toSummary)
  },
}
