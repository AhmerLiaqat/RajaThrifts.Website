import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Tabs } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils/cn'
import { bucketLabel } from '@/lib/utils/dates'
import { exportCsv, exportXlsx, type AnySheet } from '@/lib/export'
import { palette } from '@/theme/tokens'
import type { Granularity, SeriesPoint, Statement } from '@/types/finance'
import { pkr } from '../format'
import { PRESETS, type usePeriod } from '../hooks'
import type { Line } from '../statements'

// ── Period controls (one row, scopes everything below) ────────────────────────
export function PeriodControls({
  period,
  showGranularity = true,
}: {
  period: ReturnType<typeof usePeriod>
  showGranularity?: boolean
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Tabs
          value={period.preset}
          onChange={(k) => {
            const p = PRESETS.find((x) => x.key === k)
            if (p) period.setRange(...p.range())
          }}
          options={[
            ...PRESETS.map((p) => ({ value: p.key, label: p.label })),
            ...(period.preset === 'custom' ? [{ value: 'custom' as const, label: 'Custom' }] : []),
          ]}
        />
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            aria-label="From"
            value={period.from}
            max={period.to}
            onChange={(e) => e.target.value && period.setRange(e.target.value, period.to)}
            className="h-9 rounded-md border border-line-strong bg-surface-raised px-2 text-sm [color-scheme:dark] focus:border-sand focus:outline-none"
          />
          <span className="text-ink-subtle">→</span>
          <input
            type="date"
            aria-label="To"
            value={period.to}
            min={period.from}
            onChange={(e) => e.target.value && period.setRange(period.from, e.target.value)}
            className="h-9 rounded-md border border-line-strong bg-surface-raised px-2 text-sm [color-scheme:dark] focus:border-sand focus:outline-none"
          />
        </div>
      </div>
      {showGranularity && (
        <Tabs<Granularity>
          value={period.granularity}
          onChange={period.setGranularity}
          options={[
            { value: 'day', label: 'Daily' },
            { value: 'week', label: 'Weekly' },
            { value: 'month', label: 'Monthly' },
            { value: 'year', label: 'Yearly' },
          ]}
        />
      )}
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────
export function ExportButtons({
  filename,
  sheets,
  disabled,
}: {
  filename: string
  sheets: () => AnySheet[]
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => exportCsv(filename, sheets()[0])}
        >
          <Download className="size-3.5" /> CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          loading={busy}
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await exportXlsx(filename, sheets())
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <FileSpreadsheet className="size-3.5" /> Excel
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

// ── Single-measure chart (small multiples; one hue, zero line for negatives) ──
const AXIS = '#9aa5c9'
const GRID = '#34437a'
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export function MetricChart({
  title,
  series,
  metric,
  granularity,
  height = 180,
  format = 'money',
}: {
  title: string
  series: SeriesPoint[]
  metric: keyof Statement
  granularity: Granularity
  height?: number
  /** money = PKR; count = plain integers (orders, pairs). */
  format?: 'money' | 'count'
}) {
  const show = (v: number) => (format === 'money' ? pkr(v) : v.toLocaleString('en-PK'))
  const data = series.map((s) => ({ bucket: s.bucket, value: Number(s[metric] ?? 0) }))
  const total = data.reduce((a, d) => a + d.value, 0)
  const hasNegative = data.some((d) => d.value < 0)
  const barSize = Math.max(2, Math.min(24, Math.floor(600 / Math.max(1, data.length)) - 2))

  return (
    <figure className="rounded-md border border-bone/10 bg-carbon/50 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-bone">{title}</span>
        <span className={cn('font-display text-sm tabular-nums', total < 0 ? 'text-danger' : 'text-bone')}>
          {show(total)}
        </span>
      </figcaption>
      <div
        style={{ height }}
        role="img"
        aria-label={`${title} by ${granularity}. Table available in exports.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="bucket"
              tickFormatter={(b: string) => bucketLabel(b, granularity)}
              tick={{ fill: AXIS, fontSize: 10 }}
              axisLine={{ stroke: GRID }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => (v === 0 ? '0' : compact.format(v))}
              tick={{ fill: AXIS, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            {hasNegative && <ReferenceLine y={0} stroke="#4a5a96" />}
            <Tooltip
              cursor={{ fill: 'rgba(245,241,232,0.04)' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-md border border-bone/10 bg-night/95 px-3 py-2 shadow-pop">
                    <p className="font-display font-semibold text-bone tabular-nums">
                      {show(Number(payload[0].value))}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {title} · {bucketLabel(String(payload[0].payload.bucket), granularity)}
                    </p>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="value"
              fill={palette.sand}
              radius={[4, 4, 0, 0]}
              maxBarSize={barSize}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

// ── Statement table rows ──────────────────────────────────────────────────────
export function StatementTable({ lines, caption }: { lines: Line[]; caption?: string }) {
  return (
    <table className="w-full text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <tbody>
        {lines.map((l, i) => (
          <tr
            key={`${l.label}-${i}`}
            className={cn(
              l.kind === 'subtotal' && 'border-t border-bone/10',
              l.kind === 'total' && 'border-t-2 border-bone/20',
              l.kind === 'memo' && 'text-ink-subtle',
            )}
          >
            <td
              className={cn(
                'py-2 pr-3',
                l.kind === 'line' || !l.kind ? 'pl-4 text-bone/80' : 'font-medium text-bone',
                l.kind === 'memo' && 'pl-4 font-normal text-ink-subtle',
              )}
            >
              {l.sign && <span className="mr-2 inline-block w-3 text-ink-subtle">{l.sign}</span>}
              {l.label}
              {l.hint && <span className="ml-2 text-xs text-ink-subtle">{l.hint}</span>}
            </td>
            <td
              className={cn(
                'py-2 text-right tabular-nums',
                l.kind === 'total' && 'font-display text-base font-semibold',
                l.value < 0 && l.kind !== 'memo' ? 'text-danger' : l.kind === 'memo' ? '' : 'text-bone',
              )}
            >
              {pkr(l.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
