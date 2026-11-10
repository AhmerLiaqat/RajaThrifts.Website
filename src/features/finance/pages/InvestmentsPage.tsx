import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DataTable, Drawer, Pill, StatTile, TableMessage } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { sheet } from '@/lib/export'
import { todayPKT } from '@/lib/utils/dates'
import { financeService } from '@/services/finance/finance.service'
import type { Investment, InvestmentType } from '@/types/finance'
import { ExportButtons } from '../components/FinanceUI'
import { pkr } from '../format'
import { useFinanceMutation, useInvestments } from '../hooks'

const TYPE: Record<InvestmentType, { label: string; className: string }> = {
  initial: { label: 'Initial investment', className: 'border-sand/50 text-sand' },
  additional: { label: 'Additional investment', className: 'border-info/40 text-info' },
  withdrawal: { label: 'Owner withdrawal', className: 'border-warning/40 text-warning' },
}

type Draft = Omit<Investment, 'id' | 'amount'> & { id?: string; amount: string }

function InvestmentForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState(initial)
  const save = useFinanceMutation(financeService.saveInvestment)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const amount = Number(d.amount)
  const valid = amount > 0 && !!d.invested_on && d.investor.trim().length > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid)
          save.mutate(
            {
              ...d,
              amount,
              investor: d.investor.trim(),
              method: d.method?.trim() || null,
              notes: d.notes?.trim() || null,
            },
            { onSuccess: onDone },
          )
      }}
      className="flex flex-col gap-4"
    >
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      <Select label="Type" value={d.type} onChange={(e) => set({ type: e.target.value as InvestmentType })}>
        {Object.entries(TYPE).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (PKR)"
          inputMode="decimal"
          value={d.amount}
          onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, '') })}
        />
        <Input
          label="Date"
          type="date"
          value={d.invested_on}
          onChange={(e) => set({ invested_on: e.target.value })}
        />
      </div>
      <Input
        label="Investor / owner"
        value={d.investor}
        onChange={(e) => set({ investor: e.target.value })}
      />
      <Input
        label="Method (optional)"
        placeholder="Bank transfer, cash…"
        value={d.method ?? ''}
        onChange={(e) => set({ method: e.target.value })}
      />
      <Textarea
        label="Notes"
        rows={2}
        value={d.notes ?? ''}
        onChange={(e) => set({ notes: e.target.value })}
      />
      <Button type="submit" variant="accent" loading={save.isPending} disabled={!valid}>
        Save
      </Button>
      <p className="text-xs text-ink-subtle">
        Investments are owner equity: they increase cash but never count as sales or profit.
      </p>
    </form>
  )
}

export default function InvestmentsPage() {
  const investments = useInvestments()
  const remove = useFinanceMutation(financeService.deleteInvestment)
  const [editing, setEditing] = useState<Draft | null>(null)
  const rows = investments.data ?? []
  const sum = (t: InvestmentType) => rows.filter((r) => r.type === t).reduce((a, r) => a + r.amount, 0)

  return (
    <>
      <AdminPageHeader
        title="Investments"
        description="Money the owner puts into the business, and takes out. Financing only: never revenue."
        actions={
          <>
            <ExportButtons
              filename="rajathrifs-investments"
              disabled={!rows.length}
              sheets={() => [
                sheet({
                  name: 'Investments',
                  rows,
                  columns: [
                    { header: 'Date', value: (r) => r.invested_on, kind: 'date' },
                    { header: 'Type', value: (r) => TYPE[r.type].label },
                    { header: 'Investor', value: (r) => r.investor },
                    { header: 'Method', value: (r) => r.method },
                    {
                      header: 'Amount (PKR)',
                      value: (r) => (r.type === 'withdrawal' ? -r.amount : r.amount),
                      kind: 'money',
                    },
                    { header: 'Notes', value: (r) => r.notes },
                  ],
                }),
              ]}
            />
            <Button
              size="sm"
              variant="accent"
              onClick={() =>
                setEditing({
                  type: rows.length ? 'additional' : 'initial',
                  amount: '',
                  invested_on: todayPKT(),
                  investor: '',
                  method: '',
                  notes: '',
                })
              }
            >
              <Plus className="size-4" /> Record
            </Button>
          </>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Initial investment" value={pkr(sum('initial'))} />
        <StatTile label="Additional investment" value={pkr(sum('additional'))} />
        <StatTile label="Owner withdrawals" value={pkr(sum('withdrawal'))} />
        <StatTile
          label="Net owner equity in"
          value={pkr(sum('initial') + sum('additional') - sum('withdrawal'))}
        />
      </section>

      {(investments.error || remove.error) && (
        <Alert tone="error" className="mb-4">
          {(investments.error ?? remove.error)!.message}
        </Alert>
      )}

      <DataTable
        minWidth={640}
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Investor</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="w-24 px-4 py-3" />
          </tr>
        }
      >
        {investments.isPending && <TableMessage colSpan={5}>Loading…</TableMessage>}
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-2.5 text-ink-muted">{r.invested_on}</td>
            <td className="px-4 py-2.5">
              <Pill className={TYPE[r.type].className}>{TYPE[r.type].label}</Pill>
            </td>
            <td className="px-4 py-2.5">
              {r.investor}
              {r.notes && <span className="block text-xs text-ink-subtle">{r.notes}</span>}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">
              {pkr(r.type === 'withdrawal' ? -r.amount : r.amount)}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => setEditing({ ...r, amount: String(r.amount) })}
                  className="rounded p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-bone"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => window.confirm('Delete this record?') && remove.mutate(r.id)}
                  className="rounded p-1.5 text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {investments.data && rows.length === 0 && (
          <TableMessage colSpan={5}>No investments recorded yet.</TableMessage>
        )}
      </DataTable>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit record' : 'Record investment'}
        width="max-w-md"
      >
        {editing && (
          <InvestmentForm key={editing.id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />
        )}
      </Drawer>
    </>
  )
}
