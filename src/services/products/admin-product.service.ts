import { getSupabase } from '@/lib/supabase/client'
import type { BrandRow, CategoryRow, ProductImageRow, ProductWithRelationsRow } from '@/types/database'
import type {
  BrandRef,
  CategoryRef,
  ConditionGrade,
  Gender,
  Product,
  ProductDefect,
  ProductImage,
  ProductImageView,
  ProductStatus,
} from '@/types/product'
import type { Collection } from '@/constants/collections'
import type { MinorUnits } from '@/types/common'
import type { AdminProduct } from '@/types/dashboard'
import type { NumericPkr } from '@/types/database'
import { check, fromPostgrestError, ServiceError, unwrap } from '../core/errors'
import { minorToPkr, pkrToMinorOrNull } from '../core/money'
import { removeProductImages, uploadProductImage } from '../core/storage'
import { mapImage, mapProduct, PRODUCT_SELECT } from './product.mappers'

/** Shape submitted by the admin product editor. Money in paisa (MinorUnits). */
export interface ProductFormValues {
  id?: string
  slug: string
  name: string
  brandId: string
  categoryId: string | null
  model: string
  description: string
  collection: Collection
  gender: Gender
  condition: ConditionGrade
  conditionNotes: string
  defects: ProductDefect[]
  originCountry: string
  color: string
  price: MinorUnits
  compareAtPrice: MinorUnits | null
  status: ProductStatus
  isFeatured: boolean
  /** Private cost per pair (staff only). Null clears it. */
  purchasePrice: MinorUnits | null
  supplierRef: string
  variants: Array<{
    id?: string
    sku: string
    sizeValue: string
    quantity: number
    priceOverride: MinorUnits | null
  }>
}

export interface AdminProductFilters {
  search?: string
  status?: ProductStatus | 'all'
  collection?: Collection
}

/** Staff select: public product fields plus the private purchase price (RLS: staff only). */
const ADMIN_PRODUCT_SELECT = `${PRODUCT_SELECT}, cost:product_costs(purchase_price, supplier_ref)`

type CostEmbed = { purchase_price: NumericPkr; supplier_ref: string | null }
type AdminProductRow = ProductWithRelationsRow & { cost: CostEmbed | CostEmbed[] | null }

const mapAdminProduct = (row: AdminProductRow): AdminProduct => {
  const cost = Array.isArray(row.cost) ? row.cost[0] : row.cost
  return {
    ...mapProduct(row),
    purchasePrice: pkrToMinorOrNull(cost?.purchase_price),
    supplierRef: cost?.supplier_ref ?? null,
  }
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/**
 * Back-office product management. Every call is authorised by RLS
 * (staff write, admin delete); this layer only shapes data and handles storage.
 */
export const adminProductService = {
  async list(filters: AdminProductFilters = {}): Promise<AdminProduct[]> {
    let query = getSupabase()
      .from('products')
      .select(ADMIN_PRODUCT_SELECT)
      .order('updated_at', { ascending: false })
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.collection) query = query.eq('collection', filters.collection)
    const term = filters.search?.replace(/[,()%*\\]/g, ' ').trim()
    if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,model.ilike.%${term}%`)
    const { data, error } = await query
    if (error) throw fromPostgrestError(error)
    return (data as AdminProductRow[]).map(mapAdminProduct)
  },

  async get(id: string): Promise<AdminProduct> {
    const row = unwrap<AdminProductRow>(
      await getSupabase().from('products').select(ADMIN_PRODUCT_SELECT).eq('id', id).single(),
    )
    return mapAdminProduct(row)
  },

  /** Creates or updates the product and its sizes atomically (public.save_product). Returns the id. */
  async save(values: ProductFormValues): Promise<string> {
    const product = {
      id: values.id ?? '',
      slug: values.slug || slugify(values.name),
      name: values.name.trim(),
      brand_id: values.brandId,
      category_id: values.categoryId ?? '',
      model: values.model.trim(),
      description: values.description.trim(),
      collection: values.collection,
      gender: values.gender,
      condition: values.condition,
      condition_notes: values.conditionNotes.trim(),
      defects: values.defects,
      origin_country: values.originCountry.trim(),
      color: values.color.trim(),
      price: minorToPkr(values.price),
      compare_at_price: values.compareAtPrice != null ? minorToPkr(values.compareAtPrice) : '',
      status: values.status,
      is_featured: values.isFeatured,
      // Always sent: an empty string removes a previously recorded cost.
      purchase_price: values.purchasePrice != null ? minorToPkr(values.purchasePrice) : '',
      supplier_ref: values.supplierRef.trim(),
    }
    const variants = values.variants.map((v) => ({
      id: v.id ?? '',
      sku: v.sku.trim().toUpperCase(),
      size_system: 'EU',
      size_value: v.sizeValue.trim(),
      quantity: v.quantity,
      price_override: v.priceOverride != null ? minorToPkr(v.priceOverride) : '',
    }))
    return unwrap<string>(
      await getSupabase().rpc('save_product', { p_product: product, p_variants: variants }),
    )
  },

  async setStatus(id: string, status: ProductStatus): Promise<void> {
    check(await getSupabase().from('products').update({ status }).eq('id', id))
  },

  /** Bulk assign collection and/or status (staff, RLS). */
  async bulkUpdate(ids: string[], patch: { collection?: Collection; status?: ProductStatus }): Promise<void> {
    if (!ids.length) return
    check(await getSupabase().from('products').update(patch).in('id', ids))
  },

  /** Admin only (RLS). Removes storage files first so nothing is orphaned. */
  async remove(product: Pick<Product, 'id' | 'images'>): Promise<void> {
    const { data, error } = await getSupabase().from('products').delete().eq('id', product.id).select('id')
    if (error) throw fromPostgrestError(error)
    if (!data?.length)
      throw new ServiceError('FORBIDDEN', 'Only admins can delete products. Archive it instead.')
    await removeProductImages(product.images.map((i) => i.storagePath)).catch(() => {
      // Row is gone; a leftover file is harmless and can be cleaned from the dashboard.
    })
  },

  // ── Images ───────────────────────────────────────────────────────────────
  async addImage(
    productId: string,
    file: File,
    view: ProductImageView,
    alt: string,
    position: number,
  ): Promise<ProductImage> {
    const path = await uploadProductImage(productId, file)
    const res = await getSupabase()
      .from('product_images')
      .insert({ product_id: productId, storage_path: path, view, alt, position })
      .select()
      .single()
    if (res.error) {
      await removeProductImages([path]).catch(() => {})
      throw fromPostgrestError(res.error)
    }
    return mapImage(res.data as ProductImageRow)
  },

  async updateImage(
    id: string,
    patch: { view?: ProductImageView; alt?: string; position?: number },
  ): Promise<void> {
    check(await getSupabase().from('product_images').update(patch).eq('id', id))
  },

  async removeImage(image: Pick<ProductImage, 'id' | 'storagePath'>): Promise<void> {
    check(await getSupabase().from('product_images').delete().eq('id', image.id))
    await removeProductImages([image.storagePath]).catch(() => {})
  },

  // ── Reference data ───────────────────────────────────────────────────────
  async listBrands(): Promise<BrandRef[]> {
    const { data, error } = await getSupabase().from('brands').select('id, name, slug').order('name')
    if (error) throw fromPostgrestError(error)
    return data as BrandRow[]
  },

  async createBrand(name: string): Promise<BrandRef> {
    return unwrap<BrandRow>(
      await getSupabase()
        .from('brands')
        .insert({ name: name.trim(), slug: slugify(name) })
        .select('id, name, slug')
        .single(),
    )
  },

  async listCategories(): Promise<CategoryRef[]> {
    const { data, error } = await getSupabase()
      .from('categories')
      .select('id, name, slug')
      .order('sort_order')
      .order('name')
    if (error) throw fromPostgrestError(error)
    return data as CategoryRow[]
  },
}

export { slugify }
