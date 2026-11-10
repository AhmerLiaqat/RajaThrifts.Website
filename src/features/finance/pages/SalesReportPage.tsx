import { DataTable, Panel, Pill, StatTile, TableMessage } from '@/components/admin/AdminUI'
import { Alert } from '@/components/ui/Field'
import { PAYMENT_METHOD_META } from '@/constants/order'
import { BarList } from '@/features/admin/dashboard/components/SalesChart'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { sheet } from '@/lib/export'
import { ExportButtons, MetricChart, PeriodControls } from '../components/FinanceUI'
import { pkr } from '../format'
import { useDeliveredSales, useFinanceReport, usePeriod } from '../hooks'

/** Sales are recognised when an order is delivered. Cancelled and courier-returned orders are counted, never sold. */
export default function SalesReportPage() {
  const period = usePeriod()
  const report = useFinanceReport(period.from, period.to, period.granularity)
  const sales = useDeliveredSales(period.from, period.to)
  const r = report.data
  const t = r?.totals
  const rows = sales.data ?? []
  const attempted = t ? t.orders_delivered + t.orders_returned : 0

  return (
    <>
      <AdminPageHeader
        title="Sales report"
        description="Revenue recognised on delivery. Placed, cancelled and courier-returned orders are tracked separately and never count as sales."
        actions={
          <ExportButtons
            filename={`rajathrifts-sales-${period.from}-to-${period.to}`}
            disabled={!rows.length && !r}
            sheets={() => [
              sheet({
                name: 'Delivered orders',
                rows,
                columns: [
                  { header: 'Delivered', value: (o) => o.delivered_at, kind: 'date' },
                  { header: 'Order', value: (o) => o.order_number },
                  { header: 'Customer', value: (o) => o.contact_name },
                  { header: 'City', value: (o) => o.shipping_city },
                  { header: 'Payment', value: (o) => PAYMENT_METHOD_META[o.payment_method].label },
                  { header: 'Payment status', value: (o) => o.payment_status },
                  { header: 'Items (PKR)', value: (o) => o.subtotal, kind: 'money' },
                  { header: 'Discount (PKR)', value: (o) => o.discount_total, kind: 'money' },
                  { header: 'Delivery collected (PKR)', value: (o) => o.shipping_fee, kind: 'money' },
                  { header: 'Total (PKR)', value: (o) => o.total, kind: 'money' },
                  { header: 'Current status', value: (o) => o.status },
                ],
              }),
              sheet({
                name: `Sales by ${period.granularity}`,
                rows: r?.series ?? [],
                columns: [
                  { header: 'Period start', value: (s) => s.bucket, kind: 'date' },
                  { header: 'Orders placed', value: (s) => s.orders_placed, kind: 'number' },
                  { header: 'Delivered', value: (s) => s.orders_delivered, kind: 'number' },
                  { header: 'Cancelled', value: (s) => s.orders_cancelled, kind: 'number' },
                  { header: 'Returned by courier', value: (s) => s.orders_returned, kind: 'number' },
                  { header: 'Pairs sold', value: (s) => s.pairs_sold, kind: 'number' },
                  { header: 'Gross sales', value: (s) => s.gross_sales, kind: 'money' },
                  { header: 'Sales returns', value: (s) => s.sales_returns, kind: 'money' },
                  { header: 'Delivery collected', value: (s) => s.delivery_income, kind: 'money' },
                  { header: 'Net sales', value: (s) => s.net_sales, kind: 'money' },
                ],
              }),
              sheet({
                name: 'By collection',
                rows: r?.salesByCollection ?? [],
                columns: [
                  { header: 'Collection', value: (c) => c.collection },
                  { header: 'Pairs', value: (c) => c.pairs, kind: 'number' },
                  { header: 'Sales (PKR)', value: (c) => c.sales, kind: 'money' },
                ],
              }),
              sheet({
                name: 'By brand',
                rows: r?.salesByBrand ?? [],
                columns: [
                  { header: 'Brand', value: (b) => b.brand },
                  { header: 'Pairs', value: (b) => b.pairs, kind: 'number' },
                  { header: 'Sales (PKR)', value: (b) => b.sales, kind: 'money' },
                ],
              }),
            ]}
          />
        }
      />
      <PeriodControls period={period} />
      {(report.error || sales.error) && (
        <Alert tone="error" className="mb-4">
          {(report.error ?? sales.error)!.message}
        </Alert>
      )}

      {t && r && (
        <div className={cn('space-y-6', report.isPlaceholderData && 'opacity-60')}>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatTile label="Orders placed" value={t.orders_placed} />
            <StatTile label="Delivered" value={t.orders_delivered} note={`${t.pairs_sold} pairs`} />
            <StatTile label="Cancelled" value={t.orders_cancelled} />
            <StatTile label="Returned by courier" value={t.orders_returned} />
            <StatTile
              label="Delivery success"
              value={attempted ? `${Math.round((t.orders_delivered / attempted) * 100)}%` : '—'}
              note="delivered ÷ (delivered + RTO)"
            />
            <StatTile
              label="Net sales"
              value={pkr(t.net_sales)}
              note={`Gross ${pkr(t.gross_sales)} · returns ${pkr(t.sales_returns)}`}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <MetricChart title="Net sales" series={r.series} metric="net_sales" granularity={r.granularity} />
            <MetricChart
              title="Orders delivered"
              series={r.series}
              metric="orders_delivered"
              granularity={r.granularity}
              format="count"
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="By collection">
              {r.salesByCollection.length ? (
                <BarList
                  rows={r.salesByCollection.map((c) => ({
                    label: c.collection,
                    value: c.sales,
                    hint: `${c.pairs} pairs`,
                  }))}
                  format={pkr}
                />
              ) : (
                <p className="text-sm text-ink-muted">No deliveries in this period.</p>
              )}
            </Panel>
            <Panel title="Top brands">
              {r.salesByBrand.length ? (
                <BarList
                  rows={r.salesByBrand.map((b) => ({
                    label: b.brand,
                    value: b.sales,
                    hint: `${b.pairs} pairs`,
                  }))}
                  format={pkr}
                />
              ) : (
                <p className="text-sm text-ink-muted">No deliveries in this period.</p>
              )}
            </Panel>
            <Panel title="By payment method">
              {r.salesByPaymentMethod.length ? (
                <BarList
                  rows={r.salesByPaymentMethod.map((m) => ({
                    label: PAYMENT_METHOD_META[m.method].label,
                    value: m.sales,
                    hint: `${m.orders} orders`,
                  }))}
                  format={pkr}
                />
              ) : (
                <p className="text-sm text-ink-muted">No deliveries in this period.</p>
              )}
            </Panel>
          </div>
        </div>
      )}

      <h2 className="mt-10 mb-4 text-lg font-semibold">Delivered orders</h2>
      <DataTable
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Delivered</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 text-right font-medium">Items</th>
            <th className="px-4 py-3 text-right font-medium">Delivery</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        }
      >
        {sales.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {rows.map((o) => (
          <tr key={o.order_number}>
            <td className="px-4 py-2.5 text-xs text-ink-muted">{formatDate(o.delivered_at)}</td>
            <td className="px-4 py-2.5">
              <span className="font-mono">{o.order_number}</span>
              {o.status === 'refunded' && (
                <Pill className="ml-2 border-bone/20 text-ink-subtle">Refunded later</Pill>
              )}
              <span className="block text-xs text-ink-subtle">
                {o.contact_name} · {o.shipping_city}
              </span>
            </td>
            <td className="px-4 py-2.5 text-xs">
              {PAYMENT_METHOD_META[o.payment_method].label}
              <span
                className={cn('block', o.payment_status === 'pending' ? 'text-warning' : 'text-ink-subtle')}
              >
                {o.payment_status}
              </span>
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">{pkr(o.subtotal - o.discount_total)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{pkr(o.shipping_fee)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{pkr(o.total)}</td>
          </tr>
        ))}
        {sales.data && rows.length === 0 && (
          <TableMessage colSpan={6}>No orders delivered in this period.</TableMessage>
        )}
      </DataTable>
    </>
  )
}
