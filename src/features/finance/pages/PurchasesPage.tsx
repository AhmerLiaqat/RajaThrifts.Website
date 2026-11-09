import { Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  DataTable,
  Drawer,
  DrawerSection,
  Pill,
  SearchBox,
  StatTile,
  TableMessage,
} from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { useAdminProducts } from '@/features/admin/products/hooks'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { sheet } from '@/lib/export'
import { todayPKT } from '@/lib/utils/dates'
import { financeService } from '@/services/finance/finance.service'
import type { PurchaseCostType, PurchaseStatus, StockPurchase } from '@/types/finance'
import { ExportButtons } from '../components/FinanceUI'
import { pkr } from '../format'
import { useFinanceMutation, useLinkedProducts, usePurchaseCosts, usePurchases, useSuppliers } from '../hooks'

const STATUS: Record<PurchaseStatus, { label: string; className: string }> = {
  ordered: { label: 'Ordered', className: 'border-warning/40 text-warning' },
  in_transit: { label: 'In transit', className: 'border-info/40 text-info' },
  received: { label: 'Received', className: 'border-success/40 text-success' },
}

const COST_TYPES: Record<PurchaseCostType, string> = {
  freight: 'Freight / shipping',
  customs_duty: 'Customs duty & taxes',
  clearing: 'Clearing agent',
  local_transport: 'Local transport',
  other: 'Other import cost',
}

type Draft = {
  id?: string
  reference: string
  supplier_id: string
  purchase_date: string
  pairs_count: string
  goods_cost: string
  status: PurchaseStatus
  received_on: string
  description: string
  notes: string
}

const toDraft = (p?: StockPurchase): Draft => ({
  id: p?.id,
  reference: p?.reference ?? '',
  supplier_id: p?.supplier_id ?? '',
  purchase_date: p?.purchase_date ?? todayPKT(),
  pairs_count: p ? String(p.pairs_count) : '',
  goods_cost: p ? String(p.goods_cost) : '',
  status: p?.status ?? 'received',
  received_on: p?.received_on ?? '',
  description: p?.description ?? '',
  notes: p?.notes ?? '',
})

function PurchaseForm({ initial, onSaved }: { initial: Draft; onSaved: (id: string) => void }) {
  const suppliers = useSuppliers()
  const save = useFinanceMutation(financeService.savePurchase)
  const [d, setD] = useState(initial)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const pairs = Number(d.pairs_count)
  const goods = Number(d.goods_cost)
  const valid =
    d.reference.trim() &&
    Number.isInteger(pairs) &&
    pairs > 0 &&
    goods >= 0 &&
    d.goods_cost !== '' &&
    d.purchase_date

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        save.mutate(
          {
            id: d.id,
            reference: d.reference.trim().toUpperCase(),
            supplier_id: d.supplier_id || null,
            purchase_date: d.purchase_date,
            pairs_count: pairs,
            goods_cost: goods,
            status: d.status,
            received_on: d.received_on || null,
            description: d.description.trim() || null,
            notes: d.notes.trim() || null,
          },
          { onSuccess: (id) => onSaved(id as string) },
        )
      }}
      className="flex flex-col gap-4"
    >
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Reference"
          value={d.reference}
          onChange={(e) => set({ reference: e.target.value })}
          placeholder="BALE-UK-17"
        />
        <Select label="Supplier" value={d.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })}>
          <option value="">—</option>
          {suppliers.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Purchase date"
          type="date"
          value={d.purchase_date}
          onChange={(e) => set({ purchase_date: e.target.value })}
          className="[color-scheme:dark]"
        />
        <Input
          label="Pairs"
          inputMode="numeric"
          value={d.pairs_count}
          onChange={(e) => set({ pairs_count: e.target.value.replace(/\D/g, '') })}
        />
        <Input
          label="Goods cost (PKR)"
          inputMode="decimal"
          value={d.goods_cost}
          onChange={(e) => set({ goods_cost: e.target.value.replace(/[^\d.]/g, '') })}
          hint="PKR actually paid"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          value={d.status}
          onChange={(e) => set({ status: e.target.value as PurchaseStatus })}
        >
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Input
          label="Received on"
          type="date"
          value={d.received_on}
          onChange={(e) => set({ received_on: e.target.value })}
          className="[color-scheme:dark]"
        />
      </div>
      <Input
        label="Description"
        value={d.description}
        onChange={(e) => set({ description: e.target.value })}
        placeholder="Mixed sneaker bale, grade A"
      />
      <Textarea label="Notes" rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
      <Button type="submit" variant="accent" loading={save.isPending} disabled={!valid}>
        {d.id ? 'Save purchase' : 'Create purchase'}
      </Button>
    </form>
  )
}

function ImportCosts({ purchase }: { purchase: StockPurchase }) {
  const costs = usePurchaseCosts(purchase.id)
  const add = useFinanceMutation(financeService.addPurchaseCost)
  const remove = useFinanceMutation(financeService.deletePurchaseCost)
  const [type, setType] = useState<PurchaseCostType>('freight')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayPKT())
  const [vendor, setVendor] = useState('')

  return (
    <div className="flex flex-col gap-3">
      {(add.error || remove.error) && <Alert tone="error">{(add.error ?? remove.error)!.message}</Alert>}
      <ul className="divide-y divide-bone/10 text-sm">
        {costs.data?.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2">
            <span className="flex-1">
              {COST_TYPES[c.cost_type]}
              <span className="block text-xs text-ink-subtle">
                {c.cost_date}
                {c.vendor && ` · ${c.vendor}`}
              </span>
            </span>
            <span className="tabular-nums">{pkr(c.amount)}</span>
            <button
              type="button"
              aria-label="Remove cost"
              onClick={() => window.confirm('Remove this cost?') && remove.mutate(c.id)}
              className="rounded p-1 text-danger hover:bg-danger/10"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {costs.data?.length === 0 && <li className="py-2 text-ink-muted">No import costs yet.</li>}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (Number(amount) > 0)
            add.mutate(
              {
                purchase_id: purchase.id,
                cost_type: type,
                amount: Number(amount),
                cost_date: date,
                vendor: vendor.trim() || null,
                notes: null,
              },
              {
                onSuccess: () => {
                  setAmount('')
                  setVendor('')
                },
              },
            )
        }}
        className="grid grid-cols-2 gap-3 rounded-sm border border-bone/10 p-3"
      >
        <Select
          aria-label="Cost type"
          value={type}
          onChange={(e) => setType(e.target.value as PurchaseCostType)}
          className="h-10"
        >
          {Object.entries(COST_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Amount (PKR)"
          placeholder="Amount (PKR)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          className="h-10"
        />
        <Input
          aria-label="Date paid"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 [color-scheme:dark]"
        />
        <Input
          aria-label="Paid to"
          placeholder="Paid to (optional)"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="h-10"
        />
        <Button
          type="submit"
          size="sm"
          className="col-span-2"
          loading={add.isPending}
          disabled={!(Number(amount) > 0)}
        >
          <Plus className="size-3.5" /> Add import cost
        </Button>
      </form>
    </div>
  )
}

function LinkedProducts({ purchase }: { purchase: StockPurchase }) {
  const linked = useLinkedProducts(purchase.id)
  const products = useAdminProducts({ status: 'all' })
  const assign = useFinanceMutation((v: { ids: string[] | null }) =>
    financeService.assignProducts(purchase.id, v.ids, true),
  )
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const linkedIds = new Set((linked.data ?? []).map((l) => l.product_id))
  const candidates = (products.data ?? [])
    .filter((p) => !linkedIds.has(p.id))
    .filter((p) => `${p.brand} ${p.name}`.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 40)

  return (
    <div className="flex flex-col gap-3">
      {assign.error && <Alert tone="error">{assign.error.message}</Alert>}
      <p className="text-xs text-ink-muted">
        Linked products use this purchase’s landed cost of{' '}
        <span className="text-bone">{pkr(purchase.landed_unit_cost)}</span> per pair as their purchase price.
        Pairs already sold keep the cost they were sold at.
      </p>
      <ul className="divide-y divide-bone/10 text-sm">
        {linked.data?.map((l) => (
          <li key={l.product_id} className="flex justify-between py-2">
            <span>
              {l.product?.brand?.name} {l.product?.name}
            </span>
            <span
              className={
                Number(l.purchase_price) === purchase.landed_unit_cost
                  ? 'text-ink-muted tabular-nums'
                  : 'text-warning tabular-nums'
              }
            >
              {pkr(Number(l.purchase_price))}
            </span>
          </li>
        ))}
        {linked.data?.length === 0 && <li className="py-2 text-ink-muted">No products linked yet.</li>}
      </ul>
      {!!linked.data?.length && (
        <Button
          size="sm"
          variant="outline"
          loading={assign.isPending && assign.variables?.ids === null}
          onClick={() => assign.mutate({ ids: null })}
        >
          <RefreshCw className="size-3.5" /> Apply current landed cost to all linked products
        </Button>
      )}
      <div className="rounded-sm border border-bone/10 p-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Find products to link" className="h-10" />
        <ul className="mt-2 max-h-56 overflow-y-auto text-sm">
          {candidates.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={picked.has(p.id)}
                  onChange={() =>
                    setPicked((s) => {
                      const n = new Set(s)
                      if (n.has(p.id)) n.delete(p.id)
                      else n.add(p.id)
                      return n
                    })
                  }
                  className="accent-[#C7B99A]"
                />
                <span className="flex-1 truncate">
                  {p.brand} {p.name}
                </span>
                <span className="text-xs text-ink-subtle">
                  {p.purchasePrice != null ? pkr(p.purchasePrice / 100) : 'no cost'}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          className="mt-2 w-full"
          disabled={!picked.size}
          loading={assign.isPending && assign.variables?.ids !== null}
          onClick={() => assign.mutate({ ids: [...picked] }, { onSuccess: () => setPicked(new Set()) })}
        >
          <Link2 className="size-3.5" /> Link {picked.size || ''} product{picked.size === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  )
}

export default function PurchasesPage() {
  const purchases = usePurchases()
  const remove = useFinanceMutation(financeService.deletePurchase)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const rows = useMemo(() => purchases.data ?? [], [purchases.data])
  const selected = rows.find((p) => p.id === selectedId) ?? null
  const totals = {
    pairs: rows.reduce((a, p) => a + p.pairs_count, 0),
    goods: rows.reduce((a, p) => a + p.goods_cost, 0),
    imports: rows.reduce((a, p) => a + p.import_costs, 0),
    landed: rows.reduce((a, p) => a + p.landed_cost, 0),
  }

  return (
    <>
      <AdminPageHeader
        title="Stock purchases"
        description="Imported bales and shipments. Goods + import & shipping costs = landed cost, which becomes each pair’s cost and reaches the P&L only when that pair sells."
        actions={
          <>
            <ExportButtons
              filename="rajathrifs-stock-purchases"
              disabled={!rows.length}
              sheets={() => [
                sheet({
                  name: 'Stock purchases',
                  rows,
                  columns: [
                    { header: 'Reference', value: (p) => p.reference },
                    { header: 'Supplier', value: (p) => p.supplier_name },
                    { header: 'Date', value: (p) => p.purchase_date, kind: 'date' },
                    { header: 'Status', value: (p) => STATUS[p.status].label },
                    { header: 'Pairs', value: (p) => p.pairs_count, kind: 'number' },
                    { header: 'Goods (PKR)', value: (p) => p.goods_cost, kind: 'money' },
                    { header: 'Import & shipping (PKR)', value: (p) => p.import_costs, kind: 'money' },
                    { header: 'Landed (PKR)', value: (p) => p.landed_cost, kind: 'money' },
                    { header: 'Per pair (PKR)', value: (p) => p.landed_unit_cost, kind: 'money' },
                    { header: 'Linked products', value: (p) => p.linked_products, kind: 'number' },
                  ],
                }),
              ]}
            />
            <Button size="sm" variant="accent" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New purchase
            </Button>
          </>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Pairs bought" value={totals.pairs.toLocaleString('en-PK')} />
        <StatTile label="Goods cost" value={pkr(totals.goods)} />
        <StatTile label="Import & shipping" value={pkr(totals.imports)} />
        <StatTile
          label="Landed cost"
          value={pkr(totals.landed)}
          note={totals.pairs ? `avg ${pkr(totals.landed / totals.pairs)} per pair` : undefined}
        />
      </section>

      {(purchases.error || remove.error) && (
        <Alert tone="error" className="mb-4">
          {(purchases.error ?? remove.error)!.message}
        </Alert>
      )}

      <DataTable
        minWidth={900}
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Purchase</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Pairs</th>
            <th className="px-4 py-3 text-right font-medium">Goods</th>
            <th className="px-4 py-3 text-right font-medium">Import & shipping</th>
            <th className="px-4 py-3 text-right font-medium">Landed</th>
            <th className="px-4 py-3 text-right font-medium">Per pair</th>
          </tr>
        }
      >
        {purchases.isPending && <TableMessage colSpan={7}>Loading…</TableMessage>}
        {rows.map((p) => (
          <tr key={p.id} onClick={() => setSelectedId(p.id)} className="cursor-pointer hover:bg-white/[0.03]">
            <td className="px-4 py-3">
              <button type="button" className="font-mono text-bone hover:text-sand">
                {p.reference}
              </button>
              <span className="block text-xs text-ink-subtle">
                {p.purchase_date} · {p.supplier_name ?? 'No supplier'} · {p.linked_products} products linked
              </span>
            </td>
            <td className="px-4 py-3">
              <Pill className={STATUS[p.status].className}>{STATUS[p.status].label}</Pill>
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{p.pairs_count}</td>
            <td className="px-4 py-3 text-right tabular-nums">{pkr(p.goods_cost)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{pkr(p.import_costs)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{pkr(p.landed_cost)}</td>
            <td className="px-4 py-3 text-right font-display tabular-nums">{pkr(p.landed_unit_cost)}</td>
          </tr>
        ))}
        {purchases.data && rows.length === 0 && (
          <TableMessage colSpan={7}>No purchases recorded yet.</TableMessage>
        )}
      </DataTable>

      <Drawer open={creating} onClose={() => setCreating(false)} title="New stock purchase" width="max-w-lg">
        {creating && (
          <PurchaseForm
            initial={toDraft()}
            onSaved={(id) => {
              setCreating(false)
              setSelectedId(id)
            }}
          />
        )}
      </Drawer>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={<span className="font-mono">{selected?.reference}</span>}
        subtitle={
          selected && `Landed ${pkr(selected.landed_cost)} · ${pkr(selected.landed_unit_cost)} per pair`
        }
        width="max-w-2xl"
      >
        {selected && (
          <>
            <DrawerSection title="Purchase">
              <PurchaseForm key={selected.id} initial={toDraft(selected)} onSaved={() => undefined} />
            </DrawerSection>
            <DrawerSection title="Import & shipping costs">
              <ImportCosts purchase={selected} />
            </DrawerSection>
            <DrawerSection title="Products from this purchase">
              <LinkedProducts purchase={selected} />
            </DrawerSection>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() =>
                window.confirm(
                  `Delete purchase ${selected.reference} and its import costs? Linked products keep their current cost.`,
                ) && remove.mutate(selected.id, { onSuccess: () => setSelectedId(null) })
              }
            >
              <Trash2 className="size-3.5" /> Delete purchase
            </Button>
          </>
        )}
      </Drawer>
    </>
  )
}
