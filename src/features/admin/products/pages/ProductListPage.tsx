import { FileUp, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DataTable, Pill, SearchBox, TableMessage, Tabs } from '@/components/admin/AdminUI'
import { Button, ButtonLink } from '@/components/ui'
import { Alert, Select } from '@/components/ui/Field'
import { COLLECTIONS, type Collection } from '@/constants/collections'
import { isProductStatus, PRODUCT_STATUS_META, PRODUCT_STATUS_ORDER } from '@/constants/product'
import { useDashboardSummary } from '@/features/admin/hooks'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/format'
import { MIN_PRODUCT_IMAGES, type ProductStatus } from '@/types/product'
import { useAdminProducts, useBulkUpdateProducts } from '../hooks'

type StatusFilter = ProductStatus | 'all'

export default function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [debounced, setDebounced] = useState(search)
  // Kept in the URL (?status=draft) so the filter survives refresh, back and shared links.
  const rawStatus = params.get('status')
  const status: StatusFilter = isProductStatus(rawStatus) ? rawStatus : 'all'
  const setStatus = (v: StatusFilter) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v === 'all') next.delete('status')
        else next.set('status', v)
        return next
      },
      { replace: true },
    )
  const [collection, setCollection] = useState<Collection | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkCollection, setBulkCollection] = useState<Collection | ''>('')

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(id)
  }, [search])

  // Load every status once and filter here, so each tab can show its count.
  const products = useAdminProducts({ search: debounced, status: 'all', collection: collection || undefined })
  const bulk = useBulkUpdateProducts()
  const threshold = useDashboardSummary(30).data?.lowStockThreshold ?? 1

  const all = useMemo(() => products.data ?? [], [products.data])
  const rows = useMemo(() => (status === 'all' ? all : all.filter((p) => p.status === status)), [all, status])
  const statusTabs: Array<{ value: StatusFilter; label: string; count?: number }> = [
    { value: 'all', label: 'All', count: products.data ? all.length : undefined },
    ...PRODUCT_STATUS_ORDER.map((s) => ({
      value: s,
      label: PRODUCT_STATUS_META[s].label,
      count: products.data ? all.filter((p) => p.status === s).length : undefined,
    })),
  ]
  const visibleIds = rows.map((p) => p.id)
  const selectedVisible = visibleIds.filter((id) => selected.has(id))
  const allChecked = visibleIds.length > 0 && selectedVisible.length === visibleIds.length

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const [bulkNotice, setBulkNotice] = useState<string | null>(null)
  const applyBulk = (patch: { collection?: Collection; status?: ProductStatus }) => {
    let ids = selectedVisible
    setBulkNotice(null)
    // Publishing needs MIN_PRODUCT_IMAGES photos per listing; skip the ones that are not ready.
    if (patch.status === 'active') {
      const notReady = rows.filter((p) => ids.includes(p.id) && p.images.length < MIN_PRODUCT_IMAGES)
      ids = ids.filter((id) => !notReady.some((p) => p.id === id))
      if (notReady.length)
        setBulkNotice(
          `${notReady.length} ${notReady.length === 1 ? 'listing was' : 'listings were'} not published because ${
            notReady.length === 1 ? 'it has' : 'they have'
          } fewer than ${MIN_PRODUCT_IMAGES} photos: ${notReady.map((p) => p.name).join(', ')}.`,
        )
      if (!ids.length) return
    }
    bulk.mutate({ ids, patch }, { onSuccess: () => setSelected(new Set()) })
  }

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Create, edit and hide listings. Filter by Active, Sold out, Draft or Hidden. Assign each pair to PREMIUM, A CATEGORY or B CATEGORY."
        actions={
          <>
            <ButtonLink to={paths.admin.productImport} variant="outline" size="sm">
              <FileUp className="size-4" /> Bulk import
            </ButtonLink>
            <ButtonLink to={paths.admin.productNew} variant="accent" size="sm">
              <Plus className="size-4" /> New product
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={status} onChange={setStatus} options={statusTabs} />
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search name, slug or model"
          className="flex-1"
        />
        <Select
          aria-label="Collection"
          value={collection}
          onChange={(e) => setCollection(e.target.value as Collection | '')}
          className="lg:w-48"
        >
          <option value="">All collections</option>
          {COLLECTIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </div>

      {bulkNotice && (
        <Alert tone="info" className="mb-4">
          {bulkNotice}
        </Alert>
      )}

      {/* Bulk actions */}
      {selectedVisible.length > 0 && (
        <div className="sticky top-14 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sand/30 bg-white/95 p-3 shadow-pop backdrop-blur lg:top-2">
          <span className="mr-2 text-sm">
            <span className="font-semibold tabular-nums">{selectedVisible.length}</span> selected
          </span>
          <Select
            aria-label="Assign collection"
            value={bulkCollection}
            onChange={(e) => setBulkCollection(e.target.value as Collection | '')}
            className="h-9 w-44"
          >
            <option value="">Assign collection…</option>
            {COLLECTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Button
            size="sm"
            disabled={!bulkCollection}
            loading={bulk.isPending && !!bulk.variables?.patch.collection}
            onClick={() => bulkCollection && applyBulk({ collection: bulkCollection })}
          >
            Apply
          </Button>
          <span className="mx-1 h-6 w-px bg-bone/10" aria-hidden />
          <Button size="sm" variant="outline" onClick={() => applyBulk({ status: 'active' })}>
            Publish
          </Button>
          <Button size="sm" variant="ghost" onClick={() => applyBulk({ status: 'draft' })}>
            Move to draft
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              window.confirm(`Hide ${selectedVisible.length} products from the shop?`) &&
              applyBulk({ status: 'archived' })
            }
          >
            Hide
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-ink-muted hover:text-bone"
          >
            Clear
          </button>
        </div>
      )}

      {(products.error || bulk.error) && (
        <Alert tone="error" className="mb-4">
          {(products.error ?? bulk.error)!.message}
        </Alert>
      )}

      <DataTable
        minWidth={940}
        head={
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allChecked}
                onChange={() => setSelected(allChecked ? new Set() : new Set(visibleIds))}
                className="accent-sand"
              />
            </th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Collection</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Stock</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">Cost</th>
            <th className="px-4 py-3 text-right font-medium">Margin</th>
          </tr>
        }
      >
        {products.isPending && <TableMessage colSpan={8}>Loading…</TableMessage>}
        {rows.map((p) => {
          const stock = p.variants.reduce((n, v) => n + v.quantity, 0)
          const low = p.status === 'active' && stock > 0 && stock <= threshold
          const margin = p.purchasePrice != null ? p.price - p.purchasePrice : null
          return (
            <tr key={p.id} className={cn('hover:bg-surface-sunken', selected.has(p.id) && 'bg-sand/[0.04]')}>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${p.name}`}
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="accent-sand"
                />
              </td>
              <td className="px-4 py-3">
                <Link to={paths.admin.productEdit(p.id)} className="flex items-center gap-3">
                  {p.images[0] ? (
                    <img src={p.images[0].url} alt="" className="size-11 rounded object-cover" />
                  ) : (
                    <span className="grid size-11 place-items-center rounded bg-surface-sunken text-[10px] text-ink-subtle">
                      NO PHOTO
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-xs tracking-wider text-ink-subtle uppercase">
                      {p.brand}
                    </span>
                    <span className="block max-w-72 truncate text-bone hover:text-sand">{p.name}</span>
                    <span className="block font-mono text-xs text-ink-subtle">
                      {p.variants.map((v) => v.sku).join(' · ')}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block text-xs',
                        p.images.length < MIN_PRODUCT_IMAGES ? 'font-medium text-warning' : 'text-ink-subtle',
                      )}
                    >
                      {p.images.length} {p.images.length === 1 ? 'photo' : 'photos'}
                      {p.images.length < MIN_PRODUCT_IMAGES && ` · needs ${MIN_PRODUCT_IMAGES - p.images.length} more to publish`}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <CollectionBadge collection={p.collection} />
              </td>
              <td className="px-4 py-3">
                <Pill className={PRODUCT_STATUS_META[p.status].className} title={PRODUCT_STATUS_META[p.status].hint}>
                  {PRODUCT_STATUS_META[p.status].label}
                </Pill>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className={stock === 0 ? 'text-ink-subtle' : undefined}>{stock}</span>
                <span className="text-ink-subtle"> pairs</span>
                {low && <Pill className="ml-2 border-warning/40 text-warning">Low</Pill>}
                <span className="block text-xs text-ink-subtle">
                  {p.variants.length} {p.variants.length === 1 ? 'size' : 'sizes'}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatPrice(p.price)}</td>
              <td className="px-4 py-3 text-right text-ink-muted tabular-nums">
                {p.purchasePrice != null ? (
                  formatPrice(p.purchasePrice)
                ) : (
                  <span className="text-ink-subtle">—</span>
                )}
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right tabular-nums',
                  margin != null && margin < 0 && 'text-danger',
                )}
              >
                {margin != null ? (
                  <>
                    {formatPrice(margin)}
                    <span className="block text-xs text-ink-subtle">
                      {p.price > 0 ? Math.round((margin / p.price) * 100) : 0}%
                    </span>
                  </>
                ) : (
                  <span className="text-ink-subtle">—</span>
                )}
              </td>
            </tr>
          )
        })}
        {products.data && rows.length === 0 && (
          <TableMessage colSpan={8}>
            {status === 'all' ? 'No products match.' : `No ${PRODUCT_STATUS_META[status].label.toLowerCase()} products match.`}{' '}
            <Link to={paths.admin.productNew} className="text-sand underline">
              Create one
            </Link>
          </TableMessage>
        )}
      </DataTable>
    </>
  )
}
