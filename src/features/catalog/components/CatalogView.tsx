import { AlertTriangle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui'
import { env } from '@/config/env'
import type { CollectionMeta } from '@/constants/collections'
import { typeLabel } from '@/constants/product'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProductFacets, useProducts } from '../hooks/useProducts'
import { CatalogHero } from './CatalogHero'
import { ActiveFilters } from './filters/ActiveFilters'
import { CatalogToolbar } from './filters/CatalogToolbar'
import { FilterDrawer } from './filters/FilterDrawer'
import { FilterPanel } from './filters/filters'
import { ProductGrid, ProductGridEmpty, ProductGridSkeleton } from './ProductGrid'

/**
 * The complete browse experience: hero, search, sort, filters (sidebar on
 * desktop, drawer on mobile), active chips and the results grid.
 * Used by Shop All (no collection) and each collection page.
 */
export function CatalogView({ meta }: { meta?: CollectionMeta }) {
  const api = useCatalogFilters(meta?.value)
  const products = useProducts(api.filters)
  const facets = useProductFacets(api.filters)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const total = products.data?.total
  const isDemo = env.useDemoCatalog

  return (
    <>
      <CatalogHero
        meta={meta}
        audience={api.state.audience}
        typeName={api.state.type ? typeLabel(api.state.type, facets.data) : null}
        total={facets.data ? facets.data.availability.in_stock : undefined}
        isDemo={isDemo}
      />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:gap-14 lg:px-8 lg:py-14">
        {/* Desktop sidebar */}
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-[172px] max-h-[calc(100dvh-11rem)] overflow-y-auto pr-2 pb-10">
            <div className="flex items-center justify-between border-b border-bone/10 pb-4">
              <p className="text-sm font-semibold text-ink">Filters</p>
              {api.activeCount > 0 && (
                <button
                  type="button"
                  onClick={api.clearAll}
                  className="text-xs text-ink-muted underline underline-offset-4 hover:text-bone"
                >
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel api={api} facets={facets.data} />
          </div>
        </aside>

        <div className="min-w-0">
          <CatalogToolbar api={api} onOpenFilters={() => setDrawerOpen(true)} />

          <div className="mt-6 flex min-h-8 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="shrink-0 text-sm text-ink-muted" role="status" aria-live="polite">
              {total != null ? (
                <>
                  <span className="font-display text-bone tabular-nums">{total}</span>{' '}
                  {total === 1 ? 'pair' : 'pairs'}
                  {api.state.q && (
                    <>
                      {' '}
                      for <span className="text-bone">“{api.state.q}”</span>
                    </>
                  )}
                </>
              ) : (
                'Loading pairs…'
              )}
            </p>
            <ActiveFilters api={api} facets={facets.data} />
          </div>

          <div className="mt-8">
            {products.isError ? (
              <div className="flex flex-col items-center rounded-sm border border-danger/30 px-6 py-16 text-center">
                <AlertTriangle className="size-7 text-danger" aria-hidden />
                <p className="mt-4 text-bone">We couldn’t load products.</p>
                <p className="mt-1 text-sm text-ink-muted">{(products.error as Error).message}</p>
                <Button variant="outline" className="mt-6" onClick={() => products.refetch()}>
                  Try again
                </Button>
              </div>
            ) : !products.data ? (
              <ProductGridSkeleton />
            ) : products.data.items.length === 0 ? (
              <ProductGridEmpty onClear={api.activeCount ? api.clearAll : undefined} />
            ) : (
              <ProductGrid
                products={products.data.items}
                isDemo={isDemo}
                isRefreshing={products.isPlaceholderData}
              />
            )}
          </div>
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        api={api}
        facets={facets.data}
        resultCount={total}
      />
    </>
  )
}
