import { Check, History, Minus, Pencil, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import {
  DataTable,
  Drawer,
  DrawerSection,
  Pill,
  SearchBox,
  StatTile,
  TableMessage,
  Tabs,
} from '@/components/admin/AdminUI'
import { Button } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { COLLECTIONS, type Collection } from '@/constants/collections'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { InventoryRow } from '@/types/dashboard'
import type { InventoryMovementReason } from '@/types/inventory'
import { useDashboardSummary, useInventory, useInventoryMutations, useMovements } from '../../hooks'

type StockFilter = 'all' | 'low' | 'out'

const REASONS: Array<{
  value: Exclude<InventoryMovementReason, 'sale' | 'released'>
  label: string
  sign: 1 | -1 | 0
}> = [
  { value: 'intake', label: 'Intake (new shipment)', sign: 1 },
  { value: 'return', label: 'Customer return', sign: 1 },
  { value: 'adjustment', label: 'Stock count correction', sign: 0 },
  { value: 'damaged', label: 'Damaged / unsellable', sign: -1 },
]

const REASON_LABEL: Record<InventoryMovementReason, string> = {
  intake: 'Intake',
  sale: 'Sale',
  return: 'Return',
  adjustment: 'Adjustment',
  damaged: 'Damaged',
  released: 'Order cancelled',
}

function SkuCell({ row }: { row: InventoryRow }) {
  const { sku } = useInventoryMutations()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(row.sku)
  const valid = /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(value.trim().toUpperCase())

  if (!editing)
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 font-mono text-xs text-bone"
        aria-label={`Edit SKU ${row.sku}`}
      >
        {row.sku}
        <Pencil className="size-3 text-ink-subtle opacity-0 group-hover:opacity-100" />
      </button>
    )

  const save = () =>
    sku.mutate({ variantId: row.variantId, sku: value }, { onSuccess: () => setEditing(false) })

  return (
    <div>
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) save()
            if (e.key === 'Escape') setEditing(false)
          }}
          aria-label="SKU"
          className={cn(
            'h-8 w-40 rounded border bg-surface-raised px-2 font-mono text-xs focus:outline-none',
            valid ? 'border-sand' : 'border-danger',
          )}
        />
        <button
          type="button"
          disabled={!valid}
          onClick={save}
          aria-label="Save SKU"
          className="p-1 text-success disabled:opacity-30"
        >
          <Check className="size-4" />
        </button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="p-1">
          <X className="size-4" />
        </button>
      </div>
      {sku.error && <p className="mt-1 text-xs text-danger">{sku.error.message}</p>}
    </div>
  )
}

function StockPanel({ row, threshold }: { row: InventoryRow; threshold: number }) {
  const { adjust } = useInventoryMutations()
  const movements = useMovements(row.variantId)
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('intake')
  const [amount, setAmount] = useState(1)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [note, setNote] = useState('')

  const meta = REASONS.find((r) => r.value === reason)!
  const sign = meta.sign === 0 ? direction : meta.sign
  const delta = sign * amount
  const next = row.quantity + delta

  return (
    <>
      <div className="flex gap-4">
        {row.product.imageUrl && (
          <img src={row.product.imageUrl} alt="" className="size-20 rounded object-cover" />
        )}
        <div className="text-sm">
          <p className="text-bone">
            {row.product.brand} {row.product.name}
          </p>
          <p className="text-xs text-ink-muted">
            EU {row.size} · <span className="font-mono">{row.sku}</span>
          </p>
          <p className="mt-2 font-display text-2xl tabular-nums">
            {row.quantity} <span className="text-sm text-ink-muted">in stock</span>
          </p>
          {row.productStock > 0 && row.productStock <= threshold && (
            <p className="text-xs text-warning">Low stock listing</p>
          )}
        </div>
      </div>

      <DrawerSection title="Adjust stock">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (delta !== 0 && next >= 0)
              adjust.mutate(
                { variantId: row.variantId, delta, reason, note: note.trim() || undefined },
                {
                  onSuccess: () => {
                    setNote('')
                    setAmount(1)
                  },
                },
              )
          }}
          className="flex flex-col gap-4"
        >
          {adjust.error && <Alert tone="error">{adjust.error.message}</Alert>}
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-3">
            {meta.sign === 0 && (
              <div className="flex rounded-md border border-line-strong">
                {([1, -1] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    aria-pressed={direction === d}
                    aria-label={d === 1 ? 'Add pairs' : 'Remove pairs'}
                    className={cn(
                      'grid h-11 w-11 place-items-center',
                      direction === d ? 'bg-bone text-night' : 'text-ink-muted',
                    )}
                  >
                    {d === 1 ? <Plus className="size-4" /> : <Minus className="size-4" />}
                  </button>
                ))}
              </div>
            )}
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-bone/80">Pairs</span>
              <input
                type="number"
                min={1}
                max={999}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                className="h-11 rounded-md border border-line-strong bg-surface-raised px-3 text-sm tabular-nums focus:border-sand focus:outline-none"
              />
            </label>
            <p className={cn('pb-3 text-sm tabular-nums', next < 0 ? 'text-danger' : 'text-ink-muted')}>
              {row.quantity} → <span className="text-bone">{next}</span>
            </p>
          </div>
          <Textarea
            label="Note (optional)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bale reference, damage details…"
          />
          <Button type="submit" loading={adjust.isPending} disabled={next < 0}>
            Record {delta > 0 ? `+${delta}` : delta}
          </Button>
          <p className="text-xs text-ink-subtle">
            Sales and cancellations are recorded automatically by checkout.
          </p>
        </form>
      </DrawerSection>

      <DrawerSection title="History">
        {movements.isPending ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !movements.data?.length ? (
          <p className="text-sm text-ink-muted">No movements recorded.</p>
        ) : (
          <ul className="divide-y divide-bone/10 text-sm">
            {movements.data.map((mv) => (
              <li key={mv.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={cn(
                    'w-10 shrink-0 text-right font-display tabular-nums',
                    mv.delta > 0 ? 'text-success' : 'text-danger',
                  )}
                >
                  {mv.delta > 0 ? `+${mv.delta}` : mv.delta}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-bone">{REASON_LABEL[mv.reason]}</span>
                  {mv.note && <span className="block text-xs text-ink-muted">{mv.note}</span>}
                </span>
                <span className="text-xs text-ink-subtle">{formatDate(mv.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>
    </>
  )
}

export default function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const stock = (params.get('stock') as StockFilter) ?? 'all'
  const [search, setSearch] = useState('')
  const [collection, setCollection] = useState<Collection | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inventory = useInventory()
  const summary = useDashboardSummary(30)
  const threshold = summary.data?.lowStockThreshold ?? 1

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (inventory.data ?? []).filter((r) => {
      if (r.product.status === 'archived' || r.product.status === 'draft') {
        if (stock !== 'all') return false
      }
      if (stock === 'low' && !(r.quantity > 0 && r.productStock <= threshold)) return false
      if (stock === 'out' && r.quantity !== 0) return false
      if (collection && r.product.collection !== collection) return false
      if (term && !`${r.sku} ${r.product.name} ${r.product.brand}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [inventory.data, stock, collection, search, threshold])

  const all = inventory.data ?? []
  const totals = {
    skus: all.length,
    pairs: all.reduce((n, r) => n + r.quantity, 0),
    low: all.filter((r) => r.product.status === 'active' && r.quantity > 0 && r.productStock <= threshold)
      .length,
    out: all.filter((r) => r.quantity === 0).length,
  }
  const selected = all.find((r) => r.variantId === selectedId) ?? null

  return (
    <>
      <AdminPageHeader
        title="Inventory & SKUs"
        description="Every size of every listing. Edit SKUs inline, record intake, damage and corrections. Every change is written to the inventory ledger."
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="SKUs" value={totals.skus} />
        <StatTile label="Pairs on hand" value={totals.pairs} />
        <StatTile
          label={`Low stock (≤ ${threshold})`}
          value={totals.low}
          tone={totals.low ? 'attention' : 'default'}
        />
        <StatTile label="Sizes sold out" value={totals.out} />
      </section>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          value={stock}
          onChange={(v) => setParams(v === 'all' ? {} : { stock: v }, { replace: true })}
          options={[
            { value: 'all', label: 'All SKUs', count: totals.skus },
            { value: 'low', label: 'Low stock', count: totals.low },
            { value: 'out', label: 'Out of stock', count: totals.out },
          ]}
        />
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search SKU, product or brand"
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

      {inventory.error && (
        <Alert tone="error" className="mb-4">
          {inventory.error.message}
        </Alert>
      )}

      <DataTable
        minWidth={860}
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 text-right font-medium">In stock</th>
            <th className="px-4 py-3 font-medium">Listing</th>
            <th className="w-28 px-4 py-3" />
          </tr>
        }
      >
        {inventory.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {rows.map((r) => {
          const low = r.quantity > 0 && r.productStock <= threshold && r.product.status === 'active'
          return (
            <tr key={r.variantId} className="hover:bg-white/[0.02]">
              <td className="px-4 py-2.5">
                <Link
                  to={paths.admin.productEdit(r.product.id)}
                  className="flex items-center gap-3 hover:text-sand"
                >
                  {r.product.imageUrl ? (
                    <img src={r.product.imageUrl} alt="" className="size-10 rounded object-cover" />
                  ) : (
                    <span className="size-10 rounded bg-carbon" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[11px] tracking-[0.14em] text-ink-subtle uppercase">
                      {r.product.brand}
                    </span>
                    <span className="block max-w-64 truncate">{r.product.name}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2.5">
                <SkuCell key={r.sku} row={r} />
              </td>
              <td className="px-4 py-2.5 tabular-nums">EU {r.size}</td>
              <td className="px-4 py-2.5 text-right">
                <span
                  className={cn(
                    'font-display tabular-nums',
                    r.quantity === 0 ? 'text-ink-subtle' : 'text-bone',
                  )}
                >
                  {r.quantity}
                </span>
                {low && <Pill className="ml-2 border-warning/40 text-warning">Low</Pill>}
                {r.quantity === 0 && <Pill className="ml-2 border-bone/15 text-ink-subtle">Out</Pill>}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <CollectionBadge collection={r.product.collection} />
                  <span className="text-xs text-ink-subtle">{r.product.status.replace('_', ' ')}</span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right">
                <Button size="sm" variant="ghost" onClick={() => setSelectedId(r.variantId)}>
                  <History className="size-3.5" /> Stock
                </Button>
              </td>
            </tr>
          )
        })}
        {inventory.data && rows.length === 0 && (
          <TableMessage colSpan={6}>No SKUs match these filters.</TableMessage>
        )}
      </DataTable>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={<span className="font-mono">{selected?.sku}</span>}
        subtitle="Stock & history"
      >
        {selected && <StockPanel key={selected.variantId} row={selected} threshold={threshold} />}
      </Drawer>
    </>
  )
}
