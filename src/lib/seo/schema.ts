import { CONDITION_META } from '@/constants/product'
import type { Product } from '@/types/product'
import type { SeoProduct } from './copy'

/** Maps an app Product (money in paisa) onto the plain shape the shared SEO copy uses. */
export function toSeoProduct(p: Product): SeoProduct {
  const inStock = p.variants.filter((v) => v.quantity > 0)
  return {
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    description: p.description,
    price: p.price / 100,
    compareAtPrice: p.compareAtPrice != null ? p.compareAtPrice / 100 : null,
    collection: p.collection,
    conditionLabel: CONDITION_META[p.condition].label,
    color: p.color,
    sizes: (inStock.length ? inStock : p.variants).map((v) => v.size.value),
    images: p.images.map((i) => i.url),
    sku: p.variants[0]?.sku ?? null,
    inStock: inStock.length > 0,
  }
}
