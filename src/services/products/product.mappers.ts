import type { ProductImageRow, ProductVariantRow, ProductWithRelationsRow } from '@/types/database'
import type { Product, ProductImage, ProductVariant } from '@/types/product'
import { pkrToMinor, pkrToMinorOrNull } from '../core/money'
import { productImageUrl } from '../core/storage'

export { toSummary } from './product.query'

/** Embedded-relation select used everywhere products are read. */
export const PRODUCT_SELECT =
  '*, brand:brands(id, name, slug), category:categories(id, name, slug), product_images(*), product_variants(*)'

export const mapImage = (row: ProductImageRow): ProductImage => ({
  id: row.id,
  storagePath: row.storage_path,
  url: productImageUrl(row.storage_path),
  alt: row.alt,
  position: row.position,
  view: row.view,
})

export const mapVariant = (row: ProductVariantRow): ProductVariant => ({
  id: row.id,
  productId: row.product_id,
  sku: row.sku,
  size: { system: row.size_system, value: row.size_value },
  quantity: row.quantity,
  priceOverride: pkrToMinorOrNull(row.price_override),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapProduct = (row: ProductWithRelationsRow): Product => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  brand: row.brand?.name ?? 'Unknown',
  brandId: row.brand_id,
  model: row.model,
  description: row.description,
  collection: row.collection,
  category: row.category ? { id: row.category.id, name: row.category.name, slug: row.category.slug } : null,
  gender: row.gender,
  condition: row.condition,
  conditionNotes: row.condition_notes,
  defects: row.defects ?? [],
  originCountry: row.origin_country,
  color: row.color,
  price: pkrToMinor(row.price),
  compareAtPrice: pkrToMinorOrNull(row.compare_at_price),
  status: row.status,
  isFeatured: row.is_featured,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  images: [...(row.product_images ?? [])].sort((a, b) => a.position - b.position).map(mapImage),
  variants: [...(row.product_variants ?? [])]
    .sort((a, b) => Number(a.size_value) - Number(b.size_value))
    .map(mapVariant),
})
