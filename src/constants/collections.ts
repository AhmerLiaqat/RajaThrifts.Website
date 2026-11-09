/**
 * The three RajaThrifs product collections.
 * These string values are canonical: they are stored in the database exactly as written.
 * Do not add, rename or re-case them without a matching database migration.
 */
export const COLLECTIONS = ['PREMIUM', 'A CATEGORY', 'B CATEGORY'] as const

export type Collection = (typeof COLLECTIONS)[number]

/** URL-safe slugs, because "A CATEGORY" contains a space. */
export type CollectionSlug = 'premium' | 'a-category' | 'b-category'

export interface CollectionMeta {
  value: Collection
  slug: CollectionSlug
  label: Collection
  tagline: string
  /** Sort order on the storefront (lower first). */
  rank: number
}

export const COLLECTION_META: Record<Collection, CollectionMeta> = {
  PREMIUM: {
    value: 'PREMIUM',
    slug: 'premium',
    label: 'PREMIUM',
    tagline: 'Top-grade imported pairs, near-new condition.',
    rank: 1,
  },
  'A CATEGORY': {
    value: 'A CATEGORY',
    slug: 'a-category',
    label: 'A CATEGORY',
    tagline: 'Excellent condition with light signs of wear.',
    rank: 2,
  },
  'B CATEGORY': {
    value: 'B CATEGORY',
    slug: 'b-category',
    label: 'B CATEGORY',
    tagline: 'Great value pairs with visible wear.',
    rank: 3,
  },
}

const BY_SLUG = Object.fromEntries(Object.values(COLLECTION_META).map((m) => [m.slug, m])) as Record<
  CollectionSlug,
  CollectionMeta
>

export const isCollection = (value: unknown): value is Collection =>
  typeof value === 'string' && (COLLECTIONS as readonly string[]).includes(value)

export const collectionFromSlug = (slug: string | undefined): CollectionMeta | undefined =>
  slug ? BY_SLUG[slug as CollectionSlug] : undefined
