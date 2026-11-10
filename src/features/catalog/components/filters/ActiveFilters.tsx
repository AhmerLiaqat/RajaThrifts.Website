import { X } from 'lucide-react'
import type { CatalogFiltersApi } from '../../hooks/useCatalogFilters'

/** Removable chips summarising every active filter. */
export function ActiveFilters({ api }: { api: CatalogFiltersApi }) {
  const { state, update, toggle, clearAll, activeCount } = api
  if (activeCount === 0) return null

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [
    ...(state.q ? [{ key: 'q', label: `“${state.q}”`, onRemove: () => update({ q: '' }) }] : []),
    ...state.brands.map((b) => ({ key: `b-${b}`, label: b, onRemove: () => toggle('brands', b) })),
    ...state.sizes.map((s) => ({ key: `s-${s}`, label: `EU ${s}`, onRemove: () => toggle('sizes', s) })),
    ...(state.min != null
      ? [
          {
            key: 'min',
            label: `From Rs ${state.min.toLocaleString('en-PK')}`,
            onRemove: () => update({ min: null }),
          },
        ]
      : []),
    ...(state.max != null
      ? [
          {
            key: 'max',
            label: `Up to Rs ${state.max.toLocaleString('en-PK')}`,
            onRemove: () => update({ max: null }),
          },
        ]
      : []),
    ...(state.availability !== 'all'
      ? [
          {
            key: 'stock',
            label: state.availability === 'in_stock' ? 'In stock' : 'Sold out',
            onRemove: () => update({ availability: 'all' }),
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          aria-label={`Remove filter ${c.label}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-raised shadow-card py-1.5 pr-2 pl-3 text-xs text-bone transition-colors hover:border-sand"
        >
          {c.label}
          <X className="size-3.5 text-ink-muted group-hover:text-sand" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-1 text-xs text-ink-muted underline underline-offset-4 hover:text-bone"
      >
        Clear all
      </button>
    </div>
  )
}
