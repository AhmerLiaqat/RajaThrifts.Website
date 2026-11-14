import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Collection } from '@/constants/collections'
import type { Audience, Availability, ProductFilters, SortOption } from '@/types/product'

/**
 * Catalog filter state lives in the URL, so filtered views are shareable,
 * bookmarkable and survive refresh / back navigation.
 *
 *   /shop?for=women&type=hiking&q=jordan&brand=Nike&brand=Vans&size=42&uk=8&min=5000&max=20000&sort=price_asc&stock=in_stock
 *
 * Prices in the URL and UI are whole PKR; the service layer works in paisa.
 */
export interface CatalogFilterState {
  /** "Shop for" filter: men / women / kids, or null for everyone. */
  audience: Audience | null
  /** Shoe type (category slug), e.g. "hiking", or null for all types. */
  type: string | null
  q: string
  brands: string[]
  /** EU sizes (param "size"). */
  sizes: string[]
  /** UK sizes (param "uk"). */
  ukSizes: string[]
  /** Whole PKR. */
  min: number | null
  max: number | null
  sort: SortOption
  availability: Availability
}

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
]

const SORT_MAP: Record<SortOption, Pick<ProductFilters, 'sortBy' | 'sortDirection'>> = {
  newest: { sortBy: 'createdAt', sortDirection: 'desc' },
  price_asc: { sortBy: 'price', sortDirection: 'asc' },
  price_desc: { sortBy: 'price', sortDirection: 'desc' },
  name_asc: { sortBy: 'name', sortDirection: 'asc' },
}

const isSort = (v: string | null): v is SortOption => !!v && v in SORT_MAP
const isAvailability = (v: string | null): v is Availability =>
  v === 'all' || v === 'in_stock' || v === 'sold_out'

const isAudience = (v: string | null): v is Audience => v === 'men' || v === 'women' || v === 'kids'

const toNumber = (v: string | null) => {
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export function useCatalogFilters(collection?: Collection) {
  const [params, setParams] = useSearchParams()

  const state: CatalogFilterState = useMemo(
    () => ({
      audience: isAudience(params.get('for')) ? (params.get('for') as Audience) : null,
      type: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(params.get('type') ?? '') ? params.get('type') : null,
      q: params.get('q') ?? '',
      brands: params.getAll('brand'),
      sizes: params.getAll('size'),
      ukSizes: params.getAll('uk'),
      min: toNumber(params.get('min')),
      max: toNumber(params.get('max')),
      sort: isSort(params.get('sort')) ? (params.get('sort') as SortOption) : 'newest',
      availability: isAvailability(params.get('stock')) ? (params.get('stock') as Availability) : 'all',
    }),
    [params],
  )

  /** The ProductFilters the service layer understands. Stable per URL. */
  const filters: ProductFilters = useMemo(
    () => ({
      collection,
      audience: state.audience ?? undefined,
      category: state.type ?? undefined,
      search: state.q.trim() || undefined,
      brands: state.brands.length ? state.brands : undefined,
      sizes: state.sizes.length ? state.sizes : undefined,
      ukSizes: state.ukSizes.length ? state.ukSizes : undefined,
      minPrice: state.min != null ? state.min * 100 : undefined,
      maxPrice: state.max != null ? state.max * 100 : undefined,
      availability: state.availability,
      pageSize: 60,
      ...SORT_MAP[state.sort],
    }),
    [collection, state],
  )

  const update = useCallback(
    (patch: Partial<CatalogFilterState>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const set = (key: string, value: string | number | null | undefined, fallback?: string) => {
            if (value === null || value === undefined || value === '' || String(value) === fallback)
              next.delete(key)
            else next.set(key, String(value))
          }
          const setAll = (key: string, values: string[]) => {
            next.delete(key)
            values.forEach((v) => next.append(key, v))
          }
          if ('audience' in patch) set('for', patch.audience)
          if ('type' in patch) set('type', patch.type)
          if ('q' in patch) set('q', patch.q?.trim())
          if (patch.brands) setAll('brand', patch.brands)
          if (patch.sizes) setAll('size', patch.sizes)
          if (patch.ukSizes) setAll('uk', patch.ukSizes)
          if ('min' in patch) set('min', patch.min)
          if ('max' in patch) set('max', patch.max)
          if (patch.sort) set('sort', patch.sort, 'newest')
          if (patch.availability) set('stock', patch.availability, 'all')
          return next
        },
        // Typing in search should not flood browser history.
        { replace: true },
      )
    },
    [setParams],
  )

  const toggle = useCallback(
    (key: 'brands' | 'sizes' | 'ukSizes', value: string) => {
      const current = state[key]
      update({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] })
    },
    [state, update],
  )

  const clearAll = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  const activeCount =
    (state.audience ? 1 : 0) +
    (state.type ? 1 : 0) +
    state.brands.length +
    state.sizes.length +
    state.ukSizes.length +
    (state.min != null ? 1 : 0) +
    (state.max != null ? 1 : 0) +
    (state.availability !== 'all' ? 1 : 0) +
    (state.q ? 1 : 0)

  return { state, filters, update, toggle, clearAll, activeCount }
}

export type CatalogFiltersApi = ReturnType<typeof useCatalogFilters>
