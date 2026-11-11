/**
 * Pure catalog logic: filtering, sorting, faceting and relatedness.
 * Shared by the demo service (in memory) and the Supabase service (post-processing),
 * so both backends behave identically. No I/O in this file.
 */
import type {
  Availability,
  FacetCount,
  Product,
  ProductFacets,
  ProductFilters,
  ProductSummary,
} from '@/types/product'

export const isInStock = (p: Product) => p.status === 'active' && p.variants.some((v) => v.quantity > 0)

/** Only listings a customer may see. */
export const isPublic = (p: Product) => p.status === 'active' || p.status === 'sold_out'

export const toSummary = (p: Product): ProductSummary => {
  const inStock = p.variants.filter((v) => v.quantity > 0)
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    collection: p.collection,
    condition: p.condition,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    status: inStock.length === 0 && p.status === 'active' ? 'sold_out' : p.status,
    isFeatured: p.isFeatured,
    primaryImage: p.images[0] ?? null,
    availableSizes: inStock.map((v) => v.size),
    totalStock: inStock.reduce((sum, v) => sum + v.quantity, 0),
    createdAt: p.createdAt,
  }
}

const norm = (s: string) => s.trim().toLowerCase()

const matchesSearch = (p: Product, term: string) => {
  const haystack = norm(
    [p.brand, p.name, p.model, p.color, p.collection, ...p.variants.map((v) => v.sku)].join(' '),
  )
  // Every word must appear somewhere ("jordan red" matches "Jordan 1 Low, Black / Red").
  return norm(term)
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

const matchesAvailability = (p: Product, availability: Availability = 'all') =>
  availability === 'all' ? true : availability === 'in_stock' ? isInStock(p) : !isInStock(p)

type FilterKey = 'brands' | 'sizes' | 'price' | 'availability'

/**
 * Applies filters. `ignore` skips one dimension, which is how facet counts are
 * computed (a brand's count should not shrink just because that brand is unticked).
 */
export function filterProducts(products: Product[], f: ProductFilters, ignore?: FilterKey): Product[] {
  const brands = f.brands?.map(norm)
  const sizes = f.sizes
  return products.filter((p) => {
    if (!isPublic(p)) return false
    if (f.collection && p.collection !== f.collection) return false
    if (f.gender && p.gender !== f.gender) return false
    if (f.category && p.category?.slug !== f.category) return false
    if (f.condition && p.condition !== f.condition) return false
    if (f.search && !matchesSearch(p, f.search)) return false
    if (ignore !== 'brands' && brands?.length && !brands.includes(norm(p.brand))) return false
    if (
      ignore !== 'sizes' &&
      sizes?.length &&
      !p.variants.some((v) => v.quantity > 0 && sizes.includes(v.size.value))
    )
      return false
    if (ignore !== 'price') {
      if (f.minPrice != null && p.price < f.minPrice) return false
      if (f.maxPrice != null && p.price > f.maxPrice) return false
    }
    if (ignore !== 'availability' && !matchesAvailability(p, f.availability)) return false
    return true
  })
}

export function sortProducts(products: Product[], f: ProductFilters): Product[] {
  const dir = f.sortDirection === 'asc' ? 1 : -1
  const by = f.sortBy ?? 'createdAt'
  return [...products].sort((a, b) => {
    // Sold-out pairs always sink below available ones.
    const stock = Number(isInStock(b)) - Number(isInStock(a))
    if (stock !== 0) return stock
    if (by === 'price') return (a.price - b.price) * dir
    if (by === 'name') return a.name.localeCompare(b.name) * dir
    return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * dir
  })
}

const countBy = (values: string[]): FacetCount[] => {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return [...map.entries()].map(([value, count]) => ({ value, count }))
}

/** Facet options + counts for the current filter state. */
export function computeFacets(products: Product[], f: ProductFilters): ProductFacets {
  const scope = products.filter((p) => isPublic(p) && (!f.collection || p.collection === f.collection))
  const brands = countBy(filterProducts(products, f, 'brands').map((p) => p.brand)).sort((a, b) =>
    a.value.localeCompare(b.value),
  )
  const sizes = countBy(
    filterProducts(products, f, 'sizes').flatMap((p) => [
      ...new Set(p.variants.filter((v) => v.quantity > 0).map((v) => v.size.value)),
    ]),
  ).sort((a, b) => Number(a.value) - Number(b.value))
  const forAvailability = filterProducts(products, f, 'availability')
  const prices = scope.map((p) => p.price)

  return {
    brands,
    sizes,
    price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    availability: {
      in_stock: forAvailability.filter(isInStock).length,
      sold_out: forAvailability.filter((p) => !isInStock(p)).length,
    },
    total: filterProducts(products, f).length,
  }
}

/** Same collection scores highest, then same brand, then nearby price. */
export function relatedTo(product: Product, pool: Product[], limit = 4): Product[] {
  return pool
    .filter((p) => p.id !== product.id && isPublic(p))
    .map((p) => {
      let score = 0
      if (p.collection === product.collection) score += 3
      if (p.brand === product.brand) score += 2
      if (isInStock(p)) score += 1
      score -= Math.abs(p.price - product.price) / Math.max(product.price, 1)
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p)
}
