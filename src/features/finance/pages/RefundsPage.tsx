import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DataTable, Pill, StatTile, TableMessage } from '@/components/admin/AdminUI'
import { Alert } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { formatDate } from '@/lib/utils/format'
import { sheet } from '@/lib/export'
import { ExportButtons, PeriodControls } from '../components/FinanceUI'
import { pkr } from '../format'
import { useFinanceReport, usePeriod, useRefunds } from '../hooks'

/**
 * Two kinds of money going back to customers:
 *  - Return refunds (customer returned a delivered pair) → reduce sales in the P&L.
 *  - Order refunds (e.g. prepaid order cancelled before delivery) → cash only; that
 *    order was never revenue.
 */
export default function RefundsPage() {
  const period = usePeriod()
  const refunds = useRefunds(period.from, period.to)
  const report = useFinanceReport(period.from, period.to, 'month')
  const rows = refunds.data ?? []
  const fromReturns = rows.filter((r) => r.from_return)
  const orderRefunds = rows.filter((r) => !r.from_return)
  const sum = (xs: typeof rows) => xs.reduce((a, r) => a + r.amount, 0)
  const t = report.data?.totals

  return (
    <>
      <AdminPageHeader
        title="Returns & refunds"
        description="Every rupee paid back to customers. Return refunds reduce net sales; refunds of cancelled prepaid orders only affect cash."
        actions={
          <ExportButtons
            filename={`rajathrifs-refunds-${period.from}-to-${period.to}`}
            disabled={!rows.length}
            sheets={() => [
              sheet({
                name: 'Refunds',
                rows,
                columns: [
                  { header: 'Date', value: (r) => r.paid_at, kind: 'date' },
                  { header: 'Order', value: (r) => r.order_number },
                  { header: 'Customer', value: (r) => r.contact_name },
                  {
                    header: 'Type',
                    value: (r) =>
                      r.from_return ? 'Return refund (reduces sales)' : 'Order refund (cash only)',
                  },
                  { header: 'Reference', value: (r) => r.provider_reference },
                  { header: 'Notes', value: (r) => r.notes },
                  { header: 'Amount (PKR)', value: (r) => r.amount, kind: 'money' },
                ],
              }),
            ]}
          />
        }
      />
      <PeriodControls period={period} showGranularity={false} />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total refunded" value={pkr(sum(rows))} note={`${rows.length} refunds`} />
        <StatTile label="Return refunds" value={pkr(sum(fromReturns))} note="Reduce net sales" />
        <StatTile
          label="Order refunds"
          value={pkr(sum(orderRefunds))}
          note="Cancelled prepaid orders · cash only"
        />
        <StatTile
          label="Courier returns (RTO)"
          value={t ? t.orders_returned : '—'}
          note={
            t
              ? `${t.orders_delivered} delivered · ${t.orders_delivered + t.orders_returned ? Math.round((t.orders_delivered / (t.orders_delivered + t.orders_returned)) * 100) : 100}% delivery success`
              : undefined
          }
        />
      </section>

      <p className="mb-4 text-sm text-ink-muted">
        Approve and receive returned pairs in{' '}
        <Link to={paths.admin.returns} className="text-sand hover:underline">
          Returns
        </Link>
        ; issuing the refund there records it here.
      </p>

      {refunds.error && (
        <Alert tone="error" className="mb-4">
          {refunds.error.message}
        </Alert>
      )}

      <DataTable
        minWidth={680}
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Notes</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
          </tr>
        }
      >
        {refunds.isPending && <TableMessage colSpan={5}>Loading…</TableMessage>}
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-2.5 text-xs text-ink-muted">{formatDate(r.paid_at)}</td>
            <td className="px-4 py-2.5">
              <span className="font-mono">{r.order_number}</span>
              <span className="block text-xs text-ink-subtle">{r.contact_name}</span>
            </td>
            <td className="px-4 py-2.5">
              {r.from_return ? (
                <Pill className="border-sand/50 text-sand">Return refund</Pill>
              ) : (
                <Pill className="border-bone/20 text-ink-muted">Order refund</Pill>
              )}
            </td>
            <td className="px-4 py-2.5 text-xs text-ink-muted">{r.notes}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{pkr(r.amount)}</td>
          </tr>
        ))}
        {refunds.data && rows.length === 0 && (
          <TableMessage colSpan={5}>No refunds in this period.</TableMessage>
        )}
      </DataTable>
    </>
  )
}
