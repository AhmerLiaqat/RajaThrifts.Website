import { DEMO_PRODUCTS } from '@/mocks/demo-catalog'
import { ServiceError } from '../core/errors'
import { computeFacets, filterProducts, isInStock, relatedTo, sortProducts, summaryFor, toSummary } from './product.query'
import { paginate, type ProductService } from './product.service'

/** Small artificial latency so loading states are exercised during development. */
const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms))

const find = (pred: (p: (typeof DEMO_PRODUCTS)[number]) => boolean) => {
  const product = DEMO_PRODUCTS.find(pred)
  if (!product) throw new ServiceError('NOT_FOUND', 'Product not found')
  return structuredClone(product)
}

/**
 * In-memory implementation of ProductService over the demo catalog.
 * Uses the same pure query module as the Supabase service.
 */
export const demoProductService: ProductService = {
  async list(filters = {}) {
    await delay()
    const rows = sortProducts(filterProducts(DEMO_PRODUCTS, filters), filters)
    return paginate(rows.map(summaryFor(filters.audience)), filters.page, filters.pageSize)
  },

  async getFacets(filters = {}) {
    await delay(120)
    return computeFacets(DEMO_PRODUCTS, filters)
  },

  async getBySlug(slug) {
    await delay()
    return find((p) => p.slug === slug)
  },

  async getById(id) {
    await delay()
    return find((p) => p.id === id)
  },

  async listFeatured(limit = 8) {
    await delay()
    return DEMO_PRODUCTS.filter((p) => p.isFeatured && isInStock(p))
      .slice(0, limit)
      .map(toSummary)
  },

  async listRelated(product, limit = 4) {
    await delay(120)
    return relatedTo(product, DEMO_PRODUCTS, limit).map(toSummary)
  },
}
