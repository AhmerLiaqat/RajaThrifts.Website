import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { formatPrice } from '@/lib/utils/format'
import { palette } from '@/theme/tokens'
import type { DashboardSummary } from '@/types/dashboard'

// Single series → no legend; the panel title names it. One axis only.
const SERIES = palette.sand
const GRID = '#34437a'
const AXIS_TEXT = '#9aa5c9'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })

type Point = { date: string; sales: number; orders: number }

function ChartTooltip({
  active,
  payload,
}: TooltipProps<number, string> & { payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-bone/10 bg-night/95 px-3 py-2 shadow-pop">
      {/* Value leads, label follows. */}
      <p className="font-display text-base font-semibold text-bone tabular-nums">{formatPrice(p.sales)}</p>
      <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
        <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: SERIES }} aria-hidden />
        Sales · {dayLabel(p.date)} · {p.orders} {p.orders === 1 ? 'order' : 'orders'}
      </p>
    </div>
  )
}

/** Daily sales (PKR) for the selected range, with a crosshair tooltip and a table view. */
export function SalesChart({ daily }: { daily: DashboardSummary['daily'] }) {
  const data: Point[] = daily.map((d) => ({ ...d, sales: d.sales }))
  const max = Math.max(0, ...data.map((d) => d.sales))
  const best = data.find((d) => d.sales === max && max > 0)

  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label="Daily sales chart. A table view follows.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v: number) => (v === 0 ? '0' : `Rs ${compact.format(v / 100)}`)}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#4a5a96', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="sales"
              stroke={SERIES}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill={SERIES}
              fillOpacity={0.1}
              activeDot={{ r: 4, fill: SERIES, stroke: '#202b5a', strokeWidth: 2 }}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {best && (
        <p className="mt-2 text-xs text-ink-muted">
          Best day: <span className="text-bone">{dayLabel(best.date)}</span> · {formatPrice(best.sales)}
        </p>
      )}
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-ink-muted hover:text-bone">View as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded border border-bone/10">
          <table className="w-full">
            <thead className="sticky top-0 bg-carbon text-left text-ink-muted">
              <tr>
                <th className="px-3 py-1.5 font-medium">Date</th>
                <th className="px-3 py-1.5 text-right font-medium">Orders</th>
                <th className="px-3 py-1.5 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-bone/5">
                  <td className="px-3 py-1.5">{dayLabel(d.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(d.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/** Horizontal magnitude bars with the value at the tip. One hue; labels carry identity. */
export function BarList({
  rows,
  format = (n) => String(n),
}: {
  rows: Array<{ label: string; value: number; hint?: string }>
  format?: (n: number) => string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-bone/85">{r.label}</span>
            <span className="text-bone tabular-nums">
              {format(r.value)}
              {r.hint && <span className="ml-2 text-ink-subtle">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-bone/5">
            <div
              className="h-2 rounded-r-full"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: SERIES,
                minWidth: r.value > 0 ? 4 : 0,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
