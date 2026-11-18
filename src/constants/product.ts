import type {
  Audience,
  ConditionGrade,
  DefectSeverity,
  ProductFacets,
  ProductImageView,
  ProductStatus,
} from '@/types/product'

/** Name of a shoe type (category) slug: from the facets when known, else "trail-running" → "Trail running". */
export const typeLabel = (slug: string, facets?: Pick<ProductFacets, 'categories'>) =>
  facets?.categories.find((c) => c.value === slug)?.name ??
  slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')

/** Storefront "Shop for" options. */
export const AUDIENCE_LABEL: Record<Audience, string> = { men: 'Men', women: 'Women', kids: 'Kids' }

/** Customer-facing explanation of each condition grade, best to worst. */
export const CONDITION_META: Record<ConditionGrade, { label: string; description: string; rank: number }> = {
  like_new: { label: 'Like new', description: 'No visible wear. Looks fresh out of the box.', rank: 4 },
  excellent: { label: 'Excellent', description: 'Light signs of wear only visible up close.', rank: 3 },
  good: { label: 'Good', description: 'Clear signs of wear, fully wearable, cleaned.', rank: 2 },
  fair: { label: 'Fair', description: 'Heavier wear or flaws, priced accordingly.', rank: 1 },
}

export const CONDITION_ORDER: ConditionGrade[] = ['fair', 'good', 'excellent', 'like_new']

export const DEFECT_SEVERITY_META: Record<DefectSeverity, { label: string; className: string }> = {
  minor: { label: 'Minor', className: 'border-line bg-surface-sunken text-ink-muted' },
  moderate: { label: 'Moderate', className: 'border-warning/25 bg-warning/10 text-warning' },
  notable: { label: 'Notable', className: 'border-danger/25 bg-danger/10 text-danger' },
}

export const IMAGE_VIEW_LABEL: Record<ProductImageView, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  sole: 'Sole',
  top: 'Top',
  detail: 'Detail',
  on_foot: 'On foot',
}

/**
 * Back-office listing status: label, what it means for the shop, and the pill style.
 * "Hidden" is the archived status: kept for records but not shown on the storefront.
 */
export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; hint: string; className: string }> = {
  active: { label: 'Active', hint: 'Live on the shop', className: 'border-success/40 text-success' },
  sold_out: { label: 'Sold out', hint: 'Shown on the shop as sold out', className: 'border-warning/40 text-warning' },
  draft: { label: 'Draft', hint: 'Not published yet', className: 'border-bone/20 text-ink-muted' },
  archived: { label: 'Hidden', hint: 'Archived, not shown on the shop', className: 'border-bone/10 text-ink-subtle' },
}

/** Status filter order used on every admin products list. */
export const PRODUCT_STATUS_ORDER: ProductStatus[] = ['active', 'sold_out', 'draft', 'archived']

export const isProductStatus = (v: string | null): v is ProductStatus =>
  !!v && (PRODUCT_STATUS_ORDER as string[]).includes(v)
