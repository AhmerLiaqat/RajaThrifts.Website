import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Panel, StatTile, Tabs } from '@/components/admin/AdminUI'
import { Alert } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { env } from '@/config/env'
import { ORDER_STATUS_META } from '@/constants/order'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/format'
import type { OrderStatus } from '@/types/order'
import { useDashboardSummary, useInventory } from '../../hooks'
import { BarList, SalesChart } from '../components/SalesChart'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const

const pct = (n: number) => `${Math.round(n * 100)}%`

function QueueLink({
  to,
  icon: Icon,
  label,
  count,
}: {
  to: string
  icon: typeof Truck
  label: string
  count: number
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-3 rounded-md border p-4 transition-colors',
        count > 0
          ? 'border-sand/40 bg-sand/[0.04] hover:border-sand'
          : 'border-bone/10 bg-carbon/50 hover:border-bone/30',
      )}
    >
      <Icon className={cn('size-5 shrink-0', count > 0 ? 'text-sand' : 'text-ink-subtle')} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-semibold tabular-nums">{count}</span>
        <span className="block text-xs leading-snug text-ink-muted">{label}</span>
      </span>
      <ArrowRight className="size-4 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-bone" />
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const summary = useDashboardSummary(Number(range))
  const inventory = useInventory()
  const s = summary.data

  // Low stock: listed products with 1..threshold pairs left (aggregated from SKUs).
  const lowStock = useMemo(() => {
    if (!inventory.data || !s) return []
    const byProduct = new Map<string, (typeof inventory.data)[number]>()
    for (const row of inventory.data) if (!byProduct.has(row.product.id)) byProduct.set(row.product.id, row)
    return [...byProduct.values()]
      .filter(
        (r) => r.product.status === 'active' && r.productStock > 0 && r.productStock <= s.lowStockThreshold,
      )
      .slice(0, 8)
  }, [inventory.data, s])

  if (!env.isSupabaseConfigured) return <AdminPageHeader title="Dashboard" />

  return (
    <>
      <AdminPageHeader
        title={`Good to see you${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}`}
        description="Today’s queue first, then performance for the selected period. All figures in PKR, Pakistan time."
      />

      {summary.error && (
        <Alert tone="error" className="mb-6">
          {summary.error.message}
        </Alert>
      )}

      {/* Action queue */}
      <section
        aria-label="Needs attention"
        className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6"
      >
        {s ? (
          <>
            <QueueLink
              to={`${paths.admin.orders}?status=pending`}
              icon={PackageOpen}
              label="Orders to confirm"
              count={s.pendingOrders}
            />
            <QueueLink
              to={`${paths.admin.orders}?status=to_ship`}
              icon={PackageCheck}
              label="Ready to ship"
              count={s.toShip}
            />
            <QueueLink
              to={`${paths.admin.orders}?status=shipped`}
              icon={Truck}
              label="In transit"
              count={s.inTransit}
            />
            <QueueLink
              to={`${paths.admin.orders}?status=unpaid`}
              icon={Banknote}
              label="Delivered, unpaid"
              count={s.unpaidDelivered}
            />
            <QueueLink to={paths.admin.returns} icon={RotateCcw} label="Open returns" count={s.openReturns} />
            <QueueLink
              to={`${paths.admin.inventory}?stock=low`}
              icon={AlertTriangle}
              label="Low stock listings"
              count={s.inventory.lowStock}
            />
          </>
        ) : (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[74px] bg-carbon" />)
        )}
      </section>

      {/* Period filter: one row, scopes everything below */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={range} onChange={setRange} options={RANGES.map((r) => ({ ...r }))} />
        {s && (
          <p className="text-xs text-ink-subtle">
            {s.startDate} → {s.endDate}
          </p>
        )}
      </div>

      <div className={cn('space-y-6 transition-opacity', summary.isPlaceholderData && 'opacity-60')}>
        <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {s ? (
            <>
              <StatTile
                label="Sales"
                value={formatPrice(s.sales)}
                note={`${s.orders} orders · excl. cancelled`}
              />
              <StatTile label="Average order" value={formatPrice(s.avgOrderValue)} />
              <StatTile label="Pairs sold" value={s.pairsSold} note={`${s.cancelled} cancelled orders`} />
              <StatTile
                label="Gross margin"
                value={formatPrice(s.grossMargin)}
                note={
                  s.marginCoverage < 1
                    ? `${pct(s.marginCoverage)} of items have a purchase price`
                    : 'Selling price − purchase price'
                }
              />
              <StatTile
                label="Stock on hand"
                value={`${s.inventory.pairs} pairs`}
                note={`${s.inventory.listingsInStock} listings · ${s.inventory.soldOut} sold out`}
              />
            </>
          ) : (
            Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28 bg-carbon" />)
          )}
        </section>

        <Panel title="Sales by day" description="Gross sales excluding cancelled and refunded orders.">
          {s ? <SalesChart daily={s.daily} /> : <Skeleton className="h-64 bg-carbon/60" />}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Orders by status" description="Orders placed in this period.">
            {s ? (
              Object.keys(s.byStatus).length ? (
                <BarList
                  rows={(Object.keys(ORDER_STATUS_META) as OrderStatus[])
                    .filter((k) => s.byStatus[k])
                    .map((k) => ({ label: ORDER_STATUS_META[k].label, value: s.byStatus[k] }))}
                />
              ) : (
                <p className="text-sm text-ink-muted">No orders in this period.</p>
              )
            ) : (
              <Skeleton className="h-40 bg-carbon/60" />
            )}
          </Panel>

          <Panel title="Stock by collection" description="Pairs on hand · pairs sold this period.">
            {s ? (
              <BarList
                rows={s.byCollection.map((c) => ({
                  label: c.collection,
                  value: c.pairs,
                  hint: `${c.sold} sold`,
                }))}
                format={(n) => `${n} pairs`}
              />
            ) : (
              <Skeleton className="h-40 bg-carbon/60" />
            )}
          </Panel>

          <Panel title="Top brands" description="By sales this period.">
            {s ? (
              s.topBrands.length ? (
                <BarList
                  rows={s.topBrands.map((b) => ({
                    label: b.brand,
                    value: b.revenue,
                    hint: `${b.pairs} pairs`,
                  }))}
                  format={formatPrice}
                />
              ) : (
                <p className="text-sm text-ink-muted">No sales yet in this period.</p>
              )
            ) : (
              <Skeleton className="h-40 bg-carbon/60" />
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Inventory value" description="Listed stock (active and sold-out listings).">
            {s ? (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-ink-muted">At selling price</dt>
                  <dd className="mt-1 font-display text-xl tabular-nums">
                    {formatPrice(s.inventory.retailValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">At purchase price</dt>
                  <dd className="mt-1 font-display text-xl tabular-nums">
                    {formatPrice(s.inventory.costValue)}
                  </dd>
                  {s.inventory.costCoverage < 1 && (
                    <dd className="mt-1 text-xs text-warning">
                      Only {pct(s.inventory.costCoverage)} of in-stock listings have a purchase price.
                    </dd>
                  )}
                </div>
              </dl>
            ) : (
              <Skeleton className="h-24 bg-carbon/60" />
            )}
          </Panel>

          <Panel
            title="Low stock"
            description={s ? `Active listings with ${s.lowStockThreshold} or fewer pairs left.` : undefined}
            actions={
              <Link to={`${paths.admin.inventory}?stock=low`} className="text-xs text-sand hover:underline">
                Inventory
              </Link>
            }
          >
            {!inventory.data ? (
              <Skeleton className="h-24 bg-carbon/60" />
            ) : lowStock.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing is running low.</p>
            ) : (
              <ul className="divide-y divide-bone/10">
                {lowStock.map((r) => (
                  <li key={r.product.id}>
                    <Link
                      to={paths.admin.productEdit(r.product.id)}
                      className="flex items-center gap-3 py-2.5 hover:text-sand"
                    >
                      {r.product.imageUrl ? (
                        <img src={r.product.imageUrl} alt="" className="size-9 rounded object-cover" />
                      ) : (
                        <span className="size-9 rounded bg-carbon" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {r.product.brand} {r.product.name}
                      </span>
                      <span className="text-xs text-warning tabular-nums">{r.productStock} left</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
