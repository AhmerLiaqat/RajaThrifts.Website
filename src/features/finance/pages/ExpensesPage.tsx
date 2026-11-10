import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable, Drawer, StatTile, TableMessage, Tabs } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Select } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { sheet } from '@/lib/export'
import { todayPKT } from '@/lib/utils/dates'
import { financeService } from '@/services/finance/finance.service'
import { EXPENSE_CATEGORIES } from '@/constants/finance'
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from '@/types/finance'
import { ExportButtons, PeriodControls } from '../components/FinanceUI'
import { pkr } from '../format'
import { useExpenses, useFinanceMutation, usePeriod } from '../hooks'

const METHODS: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  bank: 'Bank transfer',
  card: 'Card',
  wallet: 'Easypaisa / JazzCash',
  deducted_by_courier: 'Deducted by courier',
}

type Draft = Omit<Expense, 'id' | 'courier_settlement_id' | 'amount'> & { id?: string; amount: string }

const blank = (): Draft => ({
  category: 'advertising',
  subcategory: '',
  description: '',
  amount: '',
  expense_date: todayPKT(),
  payment_method: 'cash',
  vendor: '',
  reference: '',
})

function ExpenseForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState(initial)
  const save = useFinanceMutation(financeService.saveExpense)
  const amount = Number(d.amount)
  const valid = d.description.trim().length >= 2 && amount > 0 && !!d.expense_date
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid)
          save.mutate(
            {
              ...d,
              amount,
              subcategory: d.subcategory?.trim() || null,
              vendor: d.vendor?.trim() || null,
              reference: d.reference?.trim() || null,
              description: d.description.trim(),
            },
            { onSuccess: onDone },
          )
      }}
      className="flex flex-col gap-4"
    >
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      <Select
        label="Category"
        value={d.category}
        onChange={(e) => set({ category: e.target.value as ExpenseCategory })}
      >
        {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
      <div>
        <Input
          label="Type"
          list="expense-subcategories"
          value={d.subcategory ?? ''}
          onChange={(e) => set({ subcategory: e.target.value })}
          placeholder="e.g. Meta ads"
        />
        <datalist id="expense-subcategories">
          {EXPENSE_CATEGORIES[d.category].suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <Input
        label="Description"
        value={d.description}
        onChange={(e) => set({ description: e.target.value })}
        maxLength={200}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (PKR)"
          inputMode="decimal"
          value={d.amount}
          onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, '') })}
        />
        <Input
          label="Date paid"
          type="date"
          value={d.expense_date}
          onChange={(e) => set({ expense_date: e.target.value })}
        />
      </div>
      <Select
        label="Paid by"
        value={d.payment_method}
        onChange={(e) => set({ payment_method: e.target.value as ExpensePaymentMethod })}
      >
        {Object.entries(METHODS)
          .filter(([k]) => k !== 'deducted_by_courier')
          .map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Vendor (optional)"
          value={d.vendor ?? ''}
          onChange={(e) => set({ vendor: e.target.value })}
        />
        <Input
          label="Receipt / reference"
          value={d.reference ?? ''}
          onChange={(e) => set({ reference: e.target.value })}
        />
      </div>
      <Button type="submit" variant="accent" loading={save.isPending} disabled={!valid}>
        {d.id ? 'Save expense' : 'Add expense'}
      </Button>
      <p className="text-xs text-ink-subtle">
        Stock purchases and import duties are not expenses. Record them under Stock purchases so they reach
        the P&L only when pairs sell.
      </p>
    </form>
  )
}

export default function ExpensesPage() {
  const period = usePeriod()
  const expenses = useExpenses(period.from, period.to)
  const remove = useFinanceMutation(financeService.deleteExpense)
  const [category, setCategory] = useState<ExpenseCategory | 'all'>('all')
  const [editing, setEditing] = useState<Draft | null>(null)

  const all = useMemo(() => expenses.data ?? [], [expenses.data])
  const rows = category === 'all' ? all : all.filter((e) => e.category === category)
  const totals = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((c) => ({
    c,
    sum: all.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0),
  }))
  const grand = totals.reduce((a, t) => a + t.sum, 0)

  return (
    <>
      <AdminPageHeader
        title="Operating expenses"
        description="Advertising, packaging, delivery costs the business pays, and other running costs. Courier charges from COD settlements appear here automatically."
        actions={
          <>
            <ExportButtons
              filename={`rajathrifts-expenses-${period.from}-to-${period.to}`}
              disabled={!rows.length}
              sheets={() => [
                sheet({
                  name: 'Expenses',
                  rows,
                  columns: [
                    { header: 'Date', value: (e) => e.expense_date, kind: 'date' },
                    { header: 'Category', value: (e) => EXPENSE_CATEGORIES[e.category].label },
                    { header: 'Type', value: (e) => e.subcategory },
                    { header: 'Description', value: (e) => e.description },
                    { header: 'Vendor', value: (e) => e.vendor },
                    { header: 'Paid by', value: (e) => METHODS[e.payment_method] },
                    { header: 'Reference', value: (e) => e.reference },
                    { header: 'Amount (PKR)', value: (e) => e.amount, kind: 'money' },
                  ],
                }),
              ]}
            />
            <Button size="sm" variant="accent" onClick={() => setEditing(blank())}>
              <Plus className="size-4" /> Add expense
            </Button>
          </>
        }
      />
      <PeriodControls period={period} showGranularity={false} />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Total" value={pkr(grand)} />
        {totals.map((t) => (
          <StatTile
            key={t.c}
            label={EXPENSE_CATEGORIES[t.c].label}
            value={pkr(t.sum)}
            note={grand ? `${Math.round((t.sum / grand) * 100)}%` : undefined}
          />
        ))}
      </section>

      <div className="mb-4">
        <Tabs
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'All' },
            ...totals.map((t) => ({ value: t.c, label: EXPENSE_CATEGORIES[t.c].label })),
          ]}
        />
      </div>

      {(expenses.error || remove.error) && (
        <Alert tone="error" className="mb-4">
          {(expenses.error ?? remove.error)!.message}
        </Alert>
      )}

      <DataTable
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Paid by</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="w-24 px-4 py-3" />
          </tr>
        }
      >
        {expenses.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {rows.map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">{e.expense_date}</td>
            <td className="px-4 py-2.5">
              {EXPENSE_CATEGORIES[e.category].label}
              {e.subcategory && <span className="block text-xs text-ink-subtle">{e.subcategory}</span>}
            </td>
            <td className="px-4 py-2.5">
              {e.description}
              {e.vendor && <span className="block text-xs text-ink-subtle">{e.vendor}</span>}
            </td>
            <td className="px-4 py-2.5 text-xs text-ink-muted">{METHODS[e.payment_method]}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{pkr(e.amount)}</td>
            <td className="px-4 py-2.5">
              {e.courier_settlement_id ? (
                <span className="flex justify-end text-ink-subtle" title="Created by a courier settlement">
                  <Lock className="size-4" />
                </span>
              ) : (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Edit expense"
                    onClick={() => setEditing({ ...e, amount: String(e.amount) })}
                    className="rounded p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-bone"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete expense"
                    onClick={() => window.confirm(`Delete “${e.description}”?`) && remove.mutate(e.id)}
                    className="rounded p-1.5 text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
        {expenses.data && rows.length === 0 && (
          <TableMessage colSpan={6}>No expenses in this period.</TableMessage>
        )}
      </DataTable>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit expense' : 'Add expense'}
        width="max-w-md"
      >
        {editing && (
          <ExpenseForm key={editing.id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />
        )}
      </Drawer>
    </>
  )
}
