import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { typeLabel } from '@/constants/product'
import { cn } from '@/lib/utils/cn'
import { KIDS_MAX_EU_EXCLUSIVE } from '@/services/products/product.query'
import type { Audience, Availability, ProductFacets } from '@/types/product'
import type { CatalogFiltersApi } from '../../hooks/useCatalogFilters'
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

/* ── Shoe type (category) ─────────────────────────────────────────────── */

export function CategoryFilter({ api, facets }: FilterProps) {
  const categories = facets?.categories ?? []
  const selected = api.state.type
  // Keep the chosen type visible even when nothing matches it under the other filters.
  const all =
    selected && !categories.some((c) => c.value === selected)
      ? [...categories, { value: selected, name: typeLabel(selected, facets), count: 0 }]
      : categories
  const options: Array<{ value: string | null; label: string; count?: number }> = [
    { value: null, label: 'All types' },
    ...all.map((c) => ({ value: c.value, label: c.name, count: c.count })),
  ]
  return (
    <FilterGroup title="Shoe type" badge={selected ? 1 : 0} onClear={() => api.update({ type: null })}>
      <div role="radiogroup" aria-label="Shoe type" className="flex flex-col gap-1">
        {options.map((o) => {
          const active = selected === o.value
          return (
            <button
              key={o.value ?? 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => api.update({ type: o.value })}
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

/**
 * One grid of size buttons for one size system. Only sizes with matching in-stock pairs are
 * listed (plus any size already selected, so it can be unticked).
 */
function SizeGrid({
  system,
  options,
  selected,
  onToggle,
}: {
  system: 'EU' | 'UK'
  options: Array<{ value: string; count: number }>
  selected: string[]
  onToggle: (value: string) => void
}) {
  const counts = new Map(options.map((o) => [o.value, o.count]))
  const values = [...new Set([...counts.keys(), ...selected])].sort((a, b) => Number(a) - Number(b))
  if (values.length === 0) return <p className="text-sm text-ink-subtle">No sizes in stock for this selection.</p>

  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label={`${system} sizes`}>
      {values.map((size) => {
        const isSelected = selected.includes(size)
        const count = counts.get(size) ?? 0
        const label = `${system} ${size}`
        return (
          <button
            key={size}
            type="button"
            aria-pressed={isSelected}
            title={`${count} pair${count === 1 ? '' : 's'} in ${label}`}
            onClick={() => onToggle(size)}
            className={cn(
              'flex h-11 items-center justify-center rounded-sm border font-display text-sm tabular-nums transition-colors',
              isSelected
                ? 'border-sand bg-sand text-night'
                : 'border-bone/15 text-bone/80 hover:border-bone/50 hover:text-bone',
              !isSelected && count === 0 && 'text-bone/30',
            )}
          >
            {size}
          </button>
        )
      })}
    </div>
  )
}

export function EuSizeFilter({ api, facets }: FilterProps) {
  return (
    <FilterGroup title="EU size" badge={api.state.sizes.length} onClear={() => api.update({ sizes: [] })}>
      <SizeGrid
        system="EU"
        options={facets?.sizes ?? []}
        selected={api.state.sizes}
        onToggle={(v) => api.toggle('sizes', v)}
      />
    </FilterGroup>
  )
}

export function UkSizeFilter({ api, facets }: FilterProps) {
  return (
    <FilterGroup title="UK size" badge={api.state.ukSizes.length} onClear={() => api.update({ ukSizes: [] })}>
      <SizeGrid
        system="UK"
        options={facets?.ukSizes ?? []}
        selected={api.state.ukSizes}
        onToggle={(v) => api.toggle('ukSizes', v)}
      />
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
      <CategoryFilter api={api} facets={facets} />
      <AvailabilityFilter api={api} facets={facets} />
      <BrandFilter api={api} facets={facets} />
      <EuSizeFilter api={api} facets={facets} />
      <UkSizeFilter api={api} facets={facets} />
      {/* Remount when the URL range changes elsewhere (chips, presets, clear all) to resync inputs. */}
      <PriceFilter key={`${api.state.min}-${api.state.max}`} api={api} facets={facets} />
    </div>
  )
}
