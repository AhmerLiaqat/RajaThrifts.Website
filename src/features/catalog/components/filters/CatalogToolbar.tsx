import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SORT_OPTIONS, type CatalogFiltersApi } from '../../hooks/useCatalogFilters'
import type { SortOption } from '@/types/product'

/** Search field that writes to the URL 300ms after typing stops. */
function SearchField({ api }: { api: CatalogFiltersApi }) {
  const [value, setValue] = useState(api.state.q)
  const timer = useRef<number | undefined>(undefined)
  const urlQ = api.state.q

  // Pick up external changes (chip removed, clear all, header search).
  const [lastUrlQ, setLastUrlQ] = useState(urlQ)
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ)
    setValue(urlQ)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onChange = (next: string) => {
    setValue(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => api.update({ q: next }), 300)
  }

  return (
    <div className="relative flex h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border border-line-strong bg-white shadow-sm px-4 focus-within:border-sand">
      <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            window.clearTimeout(timer.current)
            api.update({ q: value })
          }
        }}
        placeholder="Search brand, model, colour or SKU"
        aria-label="Search products"
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="text-ink-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

function SortSelect({ api }: { api: CatalogFiltersApi }) {
  return (
    <label className="relative flex h-12 min-w-0 flex-1 items-center rounded-lg sm:flex-none border border-line-strong bg-white shadow-sm focus-within:border-sand">
      <span className="sr-only">Sort by</span>
      <select
        value={api.state.sort}
        onChange={(e) => api.update({ sort: e.target.value as SortOption })}
        className="h-full w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-10 pl-4 text-sm font-medium text-ink focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="normal-case">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-ink-muted" aria-hidden />
    </label>
  )
}

interface CatalogToolbarProps {
  api: CatalogFiltersApi
  onOpenFilters: () => void
}

export function CatalogToolbar({ api, onOpenFilters }: CatalogToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchField api={api} />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line-strong bg-white shadow-sm px-5 text-sm font-medium text-ink hover:border-bone/40 lg:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {api.activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-sand text-[11px] font-semibold text-night">
              {api.activeCount}
            </span>
          )}
        </button>
        <SortSelect api={api} />
      </div>
    </div>
  )
}
