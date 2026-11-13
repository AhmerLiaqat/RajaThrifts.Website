import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils/cn'
import { KIDS_MAX_EU_EXCLUSIVE } from '@/services/products/product.query'
import type { Audience, Availability, ProductFacets } from '@/types/product'
import type { CatalogFiltersApi } from '../../hooks/useCatalogFilters'
import { useSizeConversions } from '../../hooks/useSizeConversions'
import { FilterGroup } from './FilterGroup'

interface FilterProps {
  api: CatalogFiltersApi
  facets?: ProductFacets
}

/* ── Shop for (audience) ──────────────────────────────────────────────── */

export function AudienceFilter({ api, facets }: FilterProps) {
  const options: Array<{ value: Audience | null; label: string; hint?: string; count?: number }> = [
    { value: null, label: 'Everyone' },
    { value: 'men', label: 'Men', count: facets?.audiences.men },
    { value: 'women', label: 'Women', hint: 'Includes kids’ pairs', count: facets?.audiences.women },
    { value: 'kids', label: 'Kids', hint: `Sizes under EU ${KIDS_MAX_EU_EXCLUSIVE} / UK 7`, count: facets?.audiences.kids },
  ]
  return (
    <FilterGroup title="Shop for" badge={api.state.audience ? 1 : 0} onClear={() => api.update({ audience: null })}>
      <div role="radiogroup" aria-label="Shop for" className="flex flex-col gap-1">
        {options.map((o) => {
          const active = api.state.audience === o.value
          return (
            <button
              key={o.value ?? 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => api.update({ audience: o.value })}
              className="group flex items-center justify-between rounded-sm py-1.5 text-left text-sm"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                    active ? 'border-sand' : 'border-bone/30 group-hover:border-bone/60',
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-sand" />}
                </span>
                <span>
                  <span className={cn('block', active ? 'text-bone' : 'text-bone/70 group-hover:text-bone')}>
                    {o.label}
                  </span>
                  {o.hint && <span className="block text-[11px] text-ink-subtle">{o.hint}</span>}
                </span>
              </span>
              {o.count != null && <span className="text-xs text-ink-subtle tabular-nums">{o.count}</span>}
            </button>
          )
        })}
      </div>
    </FilterGroup>
  )
}

/* ── Availability ─────────────────────────────────────────────────────── */

export function AvailabilityFilter({ api, facets }: FilterProps) {
  const options: Array<{ value: Availability; label: string; count?: number }> = [
    { value: 'all', label: 'All pairs' },
    { value: 'in_stock', label: 'In stock', count: facets?.availability.in_stock },
    { value: 'sold_out', label: 'Sold out', count: facets?.availability.sold_out },
  ]
  return (
    <FilterGroup
      title="Availability"
      badge={api.state.availability !== 'all' ? 1 : 0}
      onClear={() => api.update({ availability: 'all' })}
    >
      <div role="radiogroup" aria-label="Availability" className="flex flex-col gap-1">
        {options.map((o) => {
          const active = api.state.availability === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => api.update({ availability: o.value })}
              className="group flex items-center justify-between rounded-sm py-1.5 text-left text-sm"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-4 place-items-center rounded-full border transition-colors',
                    active ? 'border-sand' : 'border-bone/30 group-hover:border-bone/60',
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-sand" />}
                </span>
                <span className={active ? 'text-bone' : 'text-bone/70 group-hover:text-bone'}>{o.label}</span>
              </span>
              {o.count != null && <span className="text-xs text-ink-subtle tabular-nums">{o.count}</span>}
            </button>
          )
        })}
      </div>
    </FilterGroup>
  )
}

/* ── Brand ────────────────────────────────────────────────────────────── */

export function BrandFilter({ api, facets }: FilterProps) {
  const brands = facets?.brands ?? []
  // Keep selected brands visible even if they have zero results under other filters.
  const all = [
    ...brands,
    ...api.state.brands
      .filter((b) => !brands.some((f) => f.value === b))
      .map((value) => ({ value, count: 0 })),
  ]

  return (
    <FilterGroup title="Brand" badge={api.state.brands.length} onClear={() => api.update({ brands: [] })}>
      <ul className="flex flex-col gap-1">
        {all.map((b) => {
          const checked = api.state.brands.includes(b.value)
          const disabled = !checked && b.count === 0
          return (
            <li key={b.value}>
              <label
                className={cn(
                  'group flex cursor-pointer items-center justify-between py-1.5 text-sm',
                  disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => api.toggle('brands', b.value)}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-4 place-items-center rounded-[3px] border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sand',
                      checked
                        ? 'border-sand bg-sand text-night'
                        : 'border-bone/30 group-hover:border-bone/60',
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={checked ? 'text-bone' : 'text-bone/70 group-hover:text-bone'}>
                    {b.value}
                  </span>
                </span>
                <span className="text-xs text-ink-subtle tabular-nums">{b.count}</span>
              </label>
            </li>
          )
        })}
        {all.length === 0 && <li className="text-sm text-ink-subtle">No brands match.</li>}
      </ul>
    </FilterGroup>
  )
}

/* ── Size ─────────────────────────────────────────────────────────────── */

/** EU sizes the store carries (UK shown underneath). Sizes with no matching stock render disabled. */
const SIZE_RANGE = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']

export function SizeFilter({ api, facets }: FilterProps) {
  const counts = new Map(facets?.sizes.map((s) => [s.value, s.count]))
  const conv = useSizeConversions()
  const sizes = [...new Set([...SIZE_RANGE, ...counts.keys()])].sort((a, b) => Number(a) - Number(b))

  return (
    <FilterGroup title="Size (EU / UK)" badge={api.state.sizes.length} onClear={() => api.update({ sizes: [] })}>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Shoe sizes">
        {sizes.map((size) => {
          const selected = api.state.sizes.includes(size)
          const count = counts.get(size) ?? 0
          const disabled = !selected && count === 0
          const uk = conv.uk(size)
          const label = conv.label(size, ' / ')
          return (
            <button
              key={size}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              title={
                disabled ? `No pairs in ${label}` : `${count} pair${count === 1 ? '' : 's'} in ${label}`
              }
              aria-label={label}
              onClick={() => api.toggle('sizes', size)}
              className={cn(
                'flex h-12 flex-col items-center justify-center rounded-sm border font-display text-sm leading-tight tabular-nums transition-colors',
                selected
                  ? 'border-sand bg-sand text-night'
                  : 'border-bone/15 text-bone/80 hover:border-bone/50 hover:text-bone',
                disabled && 'cursor-not-allowed border-bone/5 text-bone/20 line-through hover:border-bone/5',
              )}
            >
              <span>{size}</span>
              {uk && <span className="text-[10px] opacity-70">UK {uk}</span>}
            </button>
          )
        })}
      </div>
    </FilterGroup>
  )
}

/* ── Price ────────────────────────────────────────────────────────────── */

const PRICE_PRESETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: 'Under 7,500', min: null, max: 7500 },
  { label: '7,500 – 15,000', min: 7500, max: 15000 },
  { label: '15,000 +', min: 15000, max: null },
]

export function PriceFilter({ api, facets }: FilterProps) {
  const [min, setMin] = useState(api.state.min?.toString() ?? '')
  const [max, setMax] = useState(api.state.max?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  const floor = facets ? Math.floor(facets.price.min / 100) : undefined
  const ceil = facets ? Math.ceil(facets.price.max / 100) : undefined

  const apply = (e?: FormEvent) => {
    e?.preventDefault()
    const lo = min === '' ? null : Number(min)
    const hi = max === '' ? null : Number(max)
    if (
      (lo != null && (!Number.isFinite(lo) || lo < 0)) ||
      (hi != null && (!Number.isFinite(hi) || hi < 0))
    ) {
      return setError('Enter a valid amount in PKR.')
    }
    if (lo != null && hi != null && lo > hi) return setError('Minimum must be less than maximum.')
    setError(null)
    api.update({ min: lo, max: hi })
  }

  const active = (api.state.min != null ? 1 : 0) + (api.state.max != null ? 1 : 0)

  return (
    <FilterGroup title="Price (PKR)" badge={active} onClear={() => api.update({ min: null, max: null })}>
      <form onSubmit={apply} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          {(
            [
              ['Min', min, setMin, floor],
              ['Max', max, setMax, ceil],
            ] as const
          ).map(([label, value, setter, hint], i) => (
            <label key={label} className={cn('flex flex-col gap-1.5', i === 1 && 'col-start-3')}>
              <span className="text-xs tracking-wider text-ink-subtle uppercase">{label}</span>
              <span className="flex h-10 items-center gap-1.5 rounded-sm border border-bone/15 px-2.5 focus-within:border-sand">
                <span className="text-xs text-ink-subtle">Rs</span>
                <input
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setter(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => apply()}
                  placeholder={hint?.toLocaleString('en-PK')}
                  aria-label={`${label}imum price in PKR`}
                  className="w-full min-w-0 bg-transparent text-sm text-bone tabular-nums placeholder:text-bone/25 focus:outline-none"
                />
              </span>
            </label>
          ))}
          <span className="col-start-2 row-start-1 pb-2.5 text-ink-subtle" aria-hidden>
            –
          </span>
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => {
            const on = api.state.min === p.min && api.state.max === p.max
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => api.update({ min: p.min, max: p.max })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  on
                    ? 'border-sand bg-sand/10 text-sand'
                    : 'border-bone/15 text-bone/70 hover:border-bone/40 hover:text-bone',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {/* Lets Enter submit inside either field. */}
        <button type="submit" className="sr-only">
          Apply price
        </button>
      </form>
    </FilterGroup>
  )
}

/* ── Panel ────────────────────────────────────────────────────────────── */

export function FilterPanel({ api, facets }: FilterProps) {
  return (
    <div>
      <AudienceFilter api={api} facets={facets} />
      <AvailabilityFilter api={api} facets={facets} />
      <BrandFilter api={api} facets={facets} />
      <SizeFilter api={api} facets={facets} />
      {/* Remount when the URL range changes elsewhere (chips, presets, clear all) to resync inputs. */}
      <PriceFilter key={`${api.state.min}-${api.state.max}`} api={api} facets={facets} />
    </div>
  )
}
