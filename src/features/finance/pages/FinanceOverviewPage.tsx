import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Panel, StatTile } from '@/components/admin/AdminUI'
import { Alert } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { bucketLabel } from '@/lib/utils/dates'
import { sheet } from '@/lib/export'
import type { FinanceReport, SeriesPoint } from '@/types/finance'
import { ExportButtons, MetricChart, PeriodControls, StatementTable } from '../components/FinanceUI'
import { pct, pkr } from '../format'
import { cashFlow, profitAndLoss, type Line } from '../statements'
import { useFinanceReport, usePeriod } from '../hooks'

const SERIES_COLUMNS: Array<[keyof SeriesPoint, string]> = [
  ['gross_sales', 'Gross sales'],
  ['discounts', 'Discounts'],
  ['sales_returns', 'Sales returns'],
  ['delivery_income', 'Delivery collected'],
  ['net_sales', 'Net sales'],
  ['cogs', 'COGS'],
  ['gross_profit', 'Gross profit'],
  ['opex_advertising', 'Advertising'],
  ['opex_packaging', 'Packaging'],
  ['opex_delivery', 'Delivery paid'],
  ['opex_other', 'Other operating'],
  ['operating_expenses', 'Operating expenses'],
  ['net_profit', 'Net profit'],
  ['cash_in', 'Cash in'],
  ['cash_out', 'Cash out'],
  ['net_cash', 'Net cash'],
  ['orders_delivered', 'Orders delivered'],
  ['orders_cancelled', 'Orders cancelled'],
  ['orders_returned', 'Returned by courier'],
  ['pairs_sold', 'Pairs sold'],
]

function exportSheets(r: FinanceReport) {
  const statement = (name: string, lines: Line[]) =>
    sheet({
      name,
      rows: lines,
      columns: [
        { header: 'Line', value: (l) => l.label },
        { header: 'Amount (PKR)', value: (l) => l.value, kind: 'money' },
      ],
    })
  return [
    sheet({
      name: `By ${r.granularity}`,
      rows: r.series,
      columns: [
        { header: 'Period start', value: (s) => s.bucket, kind: 'date' },
        ...SERIES_COLUMNS.map(([k, header]) => ({
          header,
          value: (s: SeriesPoint) => Number(s[k]),
          kind: (k.startsWith('orders') || k === 'pairs_sold' ? 'number' : 'money') as 'number' | 'money',
        })),
      ],
    }),
    statement('Profit and loss', profitAndLoss(r.totals)),
    statement('Cash flow', cashFlow(r.totals, r.openingCash, r.closingCash)),
    sheet({
      name: 'Pending COD by courier',
      rows: r.pendingCod.byCourier,
      columns: [
        { header: 'Courier', value: (c) => c.courier },
        { header: 'Orders', value: (c) => c.orders, kind: 'number' },
        { header: 'Amount (PKR)', value: (c) => c.amount, kind: 'money' },
      ],
    }),
  ]
}

export default function FinanceOverviewPage() {
  const period = usePeriod()
  const report = useFinanceReport(period.from, period.to, period.granularity)
  const r = report.data
  const t = r?.totals

  return (
    <>
      <AdminPageHeader
        title="Finance"
        description="Profit & loss and cash flow for the owner. Revenue counts on delivery; stock is expensed only when it sells; investments are never revenue."
        actions={
          r && (
            <ExportButtons
              filename={`rajathrifts-finance-${period.from}-to-${period.to}`}
              sheets={() => exportSheets(r)}
            />
          )
        }
      />
      <PeriodControls period={period} />

      {report.error && (
        <Alert tone="error" className="mb-6">
          {report.error.message}
        </Alert>
      )}

      {!r || !t ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity', report.isPlaceholderData && 'opacity-60')}>
          {t.cogs_missing_units > 0 && (
            <Alert tone="info" title={`${t.cogs_missing_units} sold pair(s) have no purchase price`}>
              Their cost counts as 0, which overstates profit. Link products to a stock purchase in{' '}
              <Link to={paths.admin.finance.purchases} className="underline">
                Stock purchases
              </Link>
              .
            </Alert>
          )}

          <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Net sales"
              value={pkr(t.net_sales)}
              note={`${t.orders_delivered} delivered orders · ${t.pairs_sold} pairs`}
            />
            <StatTile
              label="Gross profit"
              value={pkr(t.gross_profit)}
              note={`Margin ${pct(t.gross_margin)} · COGS ${pkr(t.cogs)}`}
            />
            <StatTile label="Operating expenses" value={pkr(t.operating_expenses)} />
            <StatTile
              label="Net profit"
              value={
                <span className={t.net_profit < 0 ? 'text-danger' : undefined}>{pkr(t.net_profit)}</span>
              }
              note={`Net margin ${pct(t.net_margin)}`}
              tone={t.net_profit < 0 ? 'attention' : 'default'}
            />
            <StatTile
              label="Net cash flow"
              value={pkr(t.net_cash)}
              note={`In ${pkr(t.cash_in)} · out ${pkr(t.cash_out)}`}
            />
            <StatTile
              label="Cash balance"
              value={pkr(r.closingCash)}
              note={`Opening ${pkr(r.openingCash)}`}
            />
            <StatTile
              label="Pending COD"
              value={pkr(r.pendingCod.deliveredAmount)}
              note={`${r.pendingCod.deliveredOrders} delivered, awaiting courier · ${pkr(r.pendingCod.inTransitAmount)} in transit`}
              tone={r.pendingCod.deliveredOrders ? 'attention' : 'default'}
            />
            <StatTile
              label="Inventory at cost"
              value={pkr(r.inventory.costValue)}
              note={`${r.inventory.pairs} pairs · not yet COGS${r.inventory.pairsWithoutCost ? ` · ${r.inventory.pairsWithoutCost} without cost` : ''}`}
            />
          </section>

          <section aria-label="Trends" className="grid gap-4 md:grid-cols-2">
            <MetricChart title="Net sales" series={r.series} metric="net_sales" granularity={r.granularity} />
            <MetricChart
              title="Gross profit"
              series={r.series}
              metric="gross_profit"
              granularity={r.granularity}
            />
            <MetricChart
              title="Operating expenses"
              series={r.series}
              metric="operating_expenses"
              granularity={r.granularity}
            />
            <MetricChart
              title="Net profit"
              series={r.series}
              metric="net_profit"
              granularity={r.granularity}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Profit & loss"
              description="Gross profit = net sales − COGS · Net profit = gross profit − operating expenses"
            >
              <StatementTable lines={profitAndLoss(t)} caption="Profit and loss" />
              <div className="mt-4 space-y-1 border-t border-bone/10 pt-3 text-xs text-ink-muted">
                <p>
                  Delivery: collected {pkr(t.delivery_income)} − paid {pkr(t.opex_delivery)} ={' '}
                  <span className={t.delivery_net < 0 ? 'text-danger' : 'text-bone'}>
                    {pkr(t.delivery_net)}
                  </span>
                </p>
                <p>Inventory bought this period (landed, not expensed): {pkr(t.inventory_purchased)}</p>
                <p>
                  Orders: {t.orders_placed} placed · {t.orders_delivered} delivered · {t.orders_cancelled}{' '}
                  cancelled · {t.orders_returned} returned by courier · {t.units_refunded}{' '}
                  {t.units_refunded === 1 ? 'pair' : 'pairs'} refunded
                </p>
              </div>
            </Panel>
            <Panel title="Cash flow" description="Cash basis: money actually received or paid in the period.">
              <StatementTable lines={cashFlow(t, r.openingCash, r.closingCash)} caption="Cash flow" />
              <p className="mt-4 border-t border-bone/10 pt-3 text-xs text-ink-muted">
                Owner equity to date: invested {pkr(r.equity.invested)} · withdrawn {pkr(r.equity.withdrawn)}.
                Investments are financing, never revenue.
              </p>
            </Panel>
          </div>

          <MetricChart
            title="Net cash flow"
            series={r.series}
            metric="net_cash"
            granularity={r.granularity}
            height={160}
          />

          <Panel
            title="Pending COD"
            description="Cash collected by couriers on delivered orders, not yet settled to you."
            actions={
              <Link to={paths.admin.finance.cod} className="text-xs text-sand hover:underline">
                Settle COD
              </Link>
            }
          >
            {r.pendingCod.byCourier.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing outstanding.</p>
            ) : (
              <ul className="divide-y divide-bone/10 text-sm">
                {r.pendingCod.byCourier.map((c) => (
                  <li key={c.courier} className="flex justify-between py-2">
                    <span>
                      {c.courier} <span className="text-xs text-ink-subtle">· {c.orders} orders</span>
                    </span>
                    <span className="tabular-nums">{pkr(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.pendingCod.oldestDeliveredAt && (
              <p className="mt-3 flex items-center gap-2 text-xs text-warning">
                <AlertTriangle className="size-3.5" /> Oldest unsettled delivery:{' '}
                {new Date(r.pendingCod.oldestDeliveredAt).toLocaleDateString('en-PK')}
              </p>
            )}
          </Panel>

          <details className="rounded-xl border border-line bg-surface-raised shadow-card p-4 text-sm">
            <summary className="cursor-pointer text-ink-muted hover:text-bone">
              View period table ({r.series.length} rows)
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="text-left text-ink-muted">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Period</th>
                    {(
                      [
                        'net_sales',
                        'cogs',
                        'gross_profit',
                        'operating_expenses',
                        'net_profit',
                        'net_cash',
                      ] as const
                    ).map((k) => (
                      <th key={k} className="py-1.5 pr-3 text-right font-medium">
                        {SERIES_COLUMNS.find(([c]) => c === k)?.[1]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.series.map((s) => (
                    <tr key={s.bucket} className="border-t border-bone/5">
                      <td className="py-1.5 pr-3">{bucketLabel(s.bucket, r.granularity)}</td>
                      {(
                        [
                          'net_sales',
                          'cogs',
                          'gross_profit',
                          'operating_expenses',
                          'net_profit',
                          'net_cash',
                        ] as const
                      ).map((k) => (
                        <td
                          key={k}
                          className={cn('py-1.5 pr-3 text-right tabular-nums', s[k] < 0 && 'text-danger')}
                        >
                          {pkr(s[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </>
  )
}
