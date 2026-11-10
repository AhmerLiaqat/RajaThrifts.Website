import { Banknote } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable, Drawer, Pill, StatTile, TableMessage, Tabs } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Textarea } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { daysBetween, todayPKT } from '@/lib/utils/dates'
import { sheet } from '@/lib/export'
import { financeService } from '@/services/finance/finance.service'
import type { PendingCodOrder } from '@/types/finance'
import { ExportButtons } from '../components/FinanceUI'
import { pkr } from '../format'
import { useFinanceMutation, usePendingCod, useSettlements } from '../hooks'

const dayOf = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(iso)) : ''

function SettleForm({ orders, onDone }: { orders: PendingCodOrder[]; onDone: () => void }) {
  const settle = useFinanceMutation(financeService.recordSettlement)
  const couriers = [...new Set(orders.map((o) => o.courier).filter(Boolean))] as string[]
  const [courier, setCourier] = useState(couriers[0] ?? '')
  const [date, setDate] = useState(todayPKT())
  const [charges, setCharges] = useState('')
  const [other, setOther] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const gross = orders.reduce((a, o) => a + o.total, 0)
  const net = gross - (Number(charges) || 0) - (Number(other) || 0)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        settle.mutate(
          {
            courier,
            settledOn: date,
            orderIds: orders.map((o) => o.id),
            courierCharges: Number(charges) || 0,
            otherDeductions: Number(other) || 0,
            reference,
            notes,
          },
          { onSuccess: onDone },
        )
      }}
      className="flex flex-col gap-4"
    >
      {settle.error && <Alert tone="error">{settle.error.message}</Alert>}
      {couriers.length > 1 && (
        <Alert tone="info">
          Selected orders use different couriers ({couriers.join(', ')}). Settle one courier at a time if they
          pay separately.
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} />
        <Input
          label="Settled on"
          type="date"
          value={date}
          max={todayPKT()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Input
        label="Settlement / invoice reference"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="TCS-INV-2291"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Courier charges deducted"
          inputMode="decimal"
          value={charges}
          onChange={(e) => setCharges(e.target.value.replace(/[^\d.]/g, ''))}
          hint="Delivery + return fees. Booked as delivery expense."
        />
        <Input
          label="Other deductions"
          inputMode="decimal"
          value={other}
          onChange={(e) => setOther(e.target.value.replace(/[^\d.]/g, ''))}
          hint="Taxes, fees. Booked as other expense."
        />
      </div>
      <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <dl className="space-y-1 rounded-sm border border-bone/10 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">COD collected ({orders.length} orders)</dt>
          <dd className="tabular-nums">{pkr(gross)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Deductions</dt>
          <dd className="tabular-nums">{pkr(-((Number(charges) || 0) + (Number(other) || 0)))}</dd>
        </div>
        <div className="flex justify-between border-t border-bone/10 pt-2 font-display text-base">
          <dt>Net received</dt>
          <dd className={cn('tabular-nums', net < 0 && 'text-danger')}>{pkr(net)}</dd>
        </div>
      </dl>
      <Button
        type="submit"
        variant="accent"
        loading={settle.isPending}
        disabled={!courier.trim() || (!orders.length && !(Number(charges) > 0))}
      >
        <Banknote className="size-4" /> Record settlement
      </Button>
    </form>
  )
}

export default function CodPage() {
  const pending = usePendingCod()
  const settlements = useSettlements()
  const [tab, setTab] = useState<'delivered' | 'shipped'>('delivered')
  const [courierFilter, setCourierFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [settling, setSettling] = useState(false)

  const all = useMemo(() => pending.data ?? [], [pending.data])
  const delivered = all.filter((o) => o.status === 'delivered')
  const inTransit = all.filter((o) => o.status === 'shipped')
  const couriers = [...new Set(delivered.map((o) => o.courier ?? 'Unassigned'))]
  const rows = (tab === 'delivered' ? delivered : inTransit).filter(
    (o) => courierFilter === 'all' || (o.courier ?? 'Unassigned') === courierFilter,
  )
  const chosen = delivered.filter((o) => selected.has(o.id))
  const sum = (xs: PendingCodOrder[]) => xs.reduce((a, o) => a + o.total, 0)

  return (
    <>
      <AdminPageHeader
        title="COD & courier settlements"
        description="Cash on delivery collected by couriers but not yet paid to you. Record each settlement to mark orders paid; courier charges are booked automatically."
        actions={
          <Button size="sm" variant="accent" disabled={!chosen.length} onClick={() => setSettling(true)}>
            <Banknote className="size-4" /> Settle {chosen.length || ''} selected
          </Button>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Pending COD (delivered)"
          value={pkr(sum(delivered))}
          note={`${delivered.length} orders with couriers`}
          tone={delivered.length ? 'attention' : 'default'}
        />
        <StatTile
          label="COD in transit"
          value={pkr(sum(inTransit))}
          note={`${inTransit.length} orders out for delivery`}
        />
        <StatTile
          label="Oldest unsettled"
          value={
            delivered[0]?.delivered_at
              ? `${daysBetween(dayOf(delivered[0].delivered_at), todayPKT())} days`
              : '—'
          }
          note={delivered[0]?.order_number}
        />
        <StatTile
          label="Settled (last 200)"
          value={pkr((settlements.data ?? []).reduce((a, s) => a + s.net_received, 0))}
          note={`${settlements.data?.length ?? 0} settlements, net received`}
        />
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={tab}
          onChange={(v) => {
            setTab(v)
            setSelected(new Set())
          }}
          options={[
            { value: 'delivered', label: 'Delivered, awaiting settlement', count: delivered.length },
            { value: 'shipped', label: 'In transit', count: inTransit.length },
          ]}
        />
        {tab === 'delivered' && couriers.length > 1 && (
          <Tabs
            value={courierFilter}
            onChange={setCourierFilter}
            options={[
              { value: 'all', label: 'All couriers' },
              ...couriers.map((c) => ({ value: c, label: c })),
            ]}
          />
        )}
      </div>

      {pending.error && (
        <Alert tone="error" className="mb-4">
          {pending.error.message}
        </Alert>
      )}

      <DataTable
        minWidth={720}
        head={
          <tr>
            {tab === 'delivered' && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={rows.length > 0 && rows.every((o) => selected.has(o.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((o) => o.id)) : new Set())}
                  className="accent-sand"
                />
              </th>
            )}
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Courier</th>
            <th className="px-4 py-3 font-medium">{tab === 'delivered' ? 'Delivered' : 'Shipped'}</th>
            <th className="px-4 py-3 text-right font-medium">COD amount</th>
          </tr>
        }
      >
        {pending.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {rows.map((o) => {
          const age = o.delivered_at ? daysBetween(dayOf(o.delivered_at), todayPKT()) : null
          return (
            <tr key={o.id} className={selected.has(o.id) ? 'bg-sand/[0.04]' : undefined}>
              {tab === 'delivered' && (
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${o.order_number}`}
                    checked={selected.has(o.id)}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s)
                        if (n.has(o.id)) n.delete(o.id)
                        else n.add(o.id)
                        return n
                      })
                    }
                    className="accent-sand"
                  />
                </td>
              )}
              <td className="px-4 py-2.5 font-mono">{o.order_number}</td>
              <td className="px-4 py-2.5">
                {o.contact_name}
                <span className="block text-xs text-ink-subtle">{o.shipping_city}</span>
              </td>
              <td className="px-4 py-2.5 text-xs">
                {o.courier ?? <span className="text-ink-subtle">Unassigned</span>}
                {o.tracking_number && (
                  <span className="block font-mono text-ink-subtle">{o.tracking_number}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-ink-muted">
                {dayOf(o.delivered_at ?? o.shipped_at)}
                {age !== null && age > 7 && (
                  <Pill className="ml-2 border-warning/40 text-warning">{age} days</Pill>
                )}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{pkr(o.total)}</td>
            </tr>
          )
        })}
        {pending.data && rows.length === 0 && <TableMessage colSpan={6}>Nothing pending here.</TableMessage>}
      </DataTable>

      <div className="mt-10 mb-4 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">Settlement history</h2>
        <ExportButtons
          filename="rajathrifs-courier-settlements"
          disabled={!settlements.data?.length}
          sheets={() => [
            sheet({
              name: 'Courier settlements',
              rows: settlements.data ?? [],
              columns: [
                { header: 'Settled on', value: (s) => s.settled_on, kind: 'date' },
                { header: 'Courier', value: (s) => s.courier },
                { header: 'Reference', value: (s) => s.reference },
                { header: 'Orders', value: (s) => s.orders_count, kind: 'number' },
                { header: 'COD collected (PKR)', value: (s) => s.gross_cod, kind: 'money' },
                { header: 'Courier charges (PKR)', value: (s) => s.courier_charges, kind: 'money' },
                { header: 'Other deductions (PKR)', value: (s) => s.other_deductions, kind: 'money' },
                { header: 'Net received (PKR)', value: (s) => s.net_received, kind: 'money' },
              ],
            }),
          ]}
        />
      </div>
      <DataTable
        minWidth={720}
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Courier</th>
            <th className="px-4 py-3 text-right font-medium">Orders</th>
            <th className="px-4 py-3 text-right font-medium">Collected</th>
            <th className="px-4 py-3 text-right font-medium">Deductions</th>
            <th className="px-4 py-3 text-right font-medium">Net received</th>
          </tr>
        }
      >
        {settlements.data?.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-2.5 text-ink-muted">{s.settled_on}</td>
            <td className="px-4 py-2.5">
              {s.courier}
              {s.reference && <span className="block font-mono text-xs text-ink-subtle">{s.reference}</span>}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">{s.orders_count}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{pkr(s.gross_cod)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">
              {pkr(-(s.courier_charges + s.other_deductions))}
            </td>
            <td
              className={cn(
                'px-4 py-2.5 text-right font-display tabular-nums',
                s.net_received < 0 && 'text-danger',
              )}
            >
              {pkr(s.net_received)}
            </td>
          </tr>
        ))}
        {settlements.data?.length === 0 && (
          <TableMessage colSpan={6}>No settlements recorded yet.</TableMessage>
        )}
      </DataTable>

      <Drawer
        open={settling}
        onClose={() => setSettling(false)}
        title="Record courier settlement"
        subtitle={`${chosen.length} orders · ${pkr(sum(chosen))}`}
        width="max-w-lg"
      >
        {settling && (
          <SettleForm
            orders={chosen}
            onDone={() => {
              setSettling(false)
              setSelected(new Set())
            }}
          />
        )}
      </Drawer>
    </>
  )
}
