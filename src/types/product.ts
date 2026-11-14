import type { Collection } from '@/constants/collections'
import type { ID, MinorUnits, PageParams, SortDirection, Timestamps } from './common'

export type Gender = 'men' | 'women' | 'unisex' | 'kids'

/** The storefront "Shop for" filter. Each audience covers several genders (see AUDIENCE_GENDERS). */
export type Audience = 'men' | 'women' | 'kids'

/** A staff-managed footwear category (Sneakers, Boots…). Distinct from the collection tier. */
export interface CategoryRef {
  id: ID
  name: string
  slug: string
}

export interface BrandRef {
  id: ID
  name: string
  slug: string
}

/**
 * Physical condition of a thrift pair, separate from its collection.
 * Collections are the commercial tier; condition is what an inspector recorded.
 */
export type ConditionGrade = 'like_new' | 'excellent' | 'good' | 'fair'

/** Lifecycle of a listing. `sold_out` is derived from stock but stored for fast filtering. */
export type ProductStatus = 'draft' | 'active' | 'sold_out' | 'archived'

export type SizeSystem = 'EU' | 'UK' | 'US'

export interface ShoeSize {
  system: SizeSystem
  /** The EU size. Stored as a string to allow values like "42.5". */
  value: string
  /** UK size entered for this pair (null only on older listings that were never re-saved). */
  uk: string | null
  /** US size entered for this pair (null only on older listings that were never re-saved). */
  us: string | null
  /** Optional foot / insole length in cm, e.g. "26.5". */
  cm: string | null
}

/**
 * The angle a photo shows. Every real listing should cover the four
 * REQUIRED_IMAGE_VIEWS; `on_foot` is added where available.
 */
export type ProductImageView = 'front' | 'side' | 'back' | 'sole' | 'top' | 'detail' | 'on_foot'

/** A listing cannot be published (status "active") with fewer photos than this. */
export const MIN_PRODUCT_IMAGES = 3

export const REQUIRED_IMAGE_VIEWS = [
  'front',
  'side',
  'back',
  'sole',
] as const satisfies readonly ProductImageView[]

export interface ProductImage {
  id: ID
  /** Path inside the Supabase Storage bucket. */
  storagePath: string
  /** Public or signed URL, resolved by the service layer. */
  url: string
  alt: string
  position: number
  view: ProductImageView
}

export type DefectSeverity = 'minor' | 'moderate' | 'notable'

/** A disclosed flaw. Thrift buyers decide on these, so they are first-class data. */
export interface ProductDefect {
  /** Where on the shoe, e.g. "Left toe box", "Outsole heel". */
  area: string
  severity: DefectSeverity
  description: string
}

/**
 * A size/stock unit of a product. Thrift stock is often a single pair,
 * so most products will have one variant with quantity 1.
 */
export interface ProductVariant extends Timestamps {
  id: ID
  productId: ID
  sku: string
  size: ShoeSize
  quantity: number
  /** Overrides the product price when set. */
  priceOverride: MinorUnits | null
}

export interface Product extends Timestamps {
  id: ID
  slug: string
  name: string
  brand: string
  /** Null for demo data, which has no brands table. */
  brandId: ID | null
  model: string | null
  description: string
  collection: Collection
  category: CategoryRef | null
  gender: Gender
  condition: ConditionGrade
  /** Inspector's free-text summary of the pair's overall condition. */
  conditionNotes: string | null
  defects: ProductDefect[]
  /** Country the pair was imported from. */
  originCountry: string | null
  color: string | null
  price: MinorUnits
  /** Original retail price, shown as a strike-through for comparison. */
  compareAtPrice: MinorUnits | null
  status: ProductStatus
  isFeatured: boolean
  images: ProductImage[]
  variants: ProductVariant[]
}

/** Lightweight shape for grids and lists. */
export type ProductSummary = Pick<
  Product,
  'id' | 'slug' | 'name' | 'brand' | 'collection' | 'condition' | 'price' | 'compareAtPrice' | 'status' | 'isFeatured'
> & {
  primaryImage: ProductImage | null
  /** In-stock sizes only. */
  availableSizes: ShoeSize[]
  totalStock: number
  createdAt: string
}

export type Availability = 'all' | 'in_stock' | 'sold_out'

export type ProductSortField = 'createdAt' | 'price' | 'name'

/** UI-facing sort choices, mapped onto field + direction by the catalog hooks. */
export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc'

export interface ProductFilters extends PageParams {
  collection?: Collection
  gender?: Gender
  /** Storefront "Shop for" filter (women also shows kids' pairs; kids only shows sizes under EU 41). */
  audience?: Audience
  /** Category slug. */
  category?: string
  condition?: ConditionGrade
  /** Match any of these brands (case-insensitive). */
  brands?: string[]
  /** Match products with an in-stock variant in any of these EU sizes. */
  sizes?: string[]
  minPrice?: MinorUnits
  maxPrice?: MinorUnits
  search?: string
  availability?: Availability
  sortBy?: ProductSortField
  sortDirection?: SortDirection
}

export interface FacetCount {
  value: string
  count: number
}

/** An EU size option with the UK / US sizes most often entered for it (they vary by brand). */
export interface SizeFacet extends FacetCount {
  uk: string | null
  us: string | null
}

/** Options and counts for building the filter UI within a scope (e.g. one collection). */
/** A shoe type (category) option. `value` is the slug. */
export interface CategoryFacet extends FacetCount {
  name: string
}

export interface ProductFacets {
  brands: FacetCount[]
  /** Shoe types (categories) with matching pairs, ignoring the current shoe-type choice. */
  categories: CategoryFacet[]
  sizes: SizeFacet[]
  price: { min: MinorUnits; max: MinorUnits }
  availability: Record<Exclude<Availability, 'all'>, number>
  /** Matching pairs per "Shop for" option, ignoring the current audience choice. */
  audiences: Record<Audience, number>
  total: number
}

/** Payload for admin create/update forms (no server-generated fields). */
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'images' | 'variants'> & {
  variants: Array<Pick<ProductVariant, 'sku' | 'size' | 'quantity' | 'priceOverride'>>
}
