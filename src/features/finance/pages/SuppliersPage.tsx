import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { DataTable, Drawer, Pill, TableMessage } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Textarea } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { sheet } from '@/lib/export'
import { financeService } from '@/services/finance/finance.service'
import type { Supplier } from '@/types/finance'
import { ExportButtons } from '../components/FinanceUI'
import { pkr } from '../format'
import { useFinanceMutation, usePurchases, useSuppliers } from '../hooks'

type Draft = Omit<Supplier, 'id'> & { id?: string }

function SupplierForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const [d, setD] = useState(initial)
  const save = useFinanceMutation(financeService.saveSupplier)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const clean = (v: string | null) => v?.trim() || null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (d.name.trim())
          save.mutate(
            {
              ...d,
              name: d.name.trim(),
              country: clean(d.country),
              contact_name: clean(d.contact_name),
              phone: clean(d.phone),
              email: clean(d.email),
              notes: clean(d.notes),
            },
            { onSuccess: onDone },
          )
      }}
      className="flex flex-col gap-4"
    >
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      <Input label="Supplier name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Country"
          value={d.country ?? ''}
          onChange={(e) => set({ country: e.target.value })}
          placeholder="United Kingdom"
        />
        <Input
          label="Contact person"
          value={d.contact_name ?? ''}
          onChange={(e) => set({ contact_name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone / WhatsApp"
          value={d.phone ?? ''}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          value={d.email ?? ''}
          onChange={(e) => set({ email: e.target.value })}
        />
      </div>
      <Textarea
        label="Notes"
        rows={3}
        value={d.notes ?? ''}
        onChange={(e) => set({ notes: e.target.value })}
        placeholder="Grading quality, payment terms, lead times…"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={d.is_active}
          onChange={(e) => set({ is_active: e.target.checked })}
          className="accent-sand"
        />{' '}
        Active supplier
      </label>
      <Button type="submit" variant="accent" loading={save.isPending} disabled={!d.name.trim()}>
        Save supplier
      </Button>
    </form>
  )
}

export default function SuppliersPage() {
  const suppliers = useSuppliers()
  const purchases = usePurchases()
  const [editing, setEditing] = useState<Draft | null>(null)

  const stats = (id: string) => {
    const mine = (purchases.data ?? []).filter((p) => p.supplier_id === id)
    return {
      count: mine.length,
      pairs: mine.reduce((a, p) => a + p.pairs_count, 0),
      landed: mine.reduce((a, p) => a + p.landed_cost, 0),
      last: mine[0]?.purchase_date,
    }
  }
  const rows = suppliers.data ?? []

  return (
    <>
      <AdminPageHeader
        title="Suppliers"
        description="Who you import stock from, with lifetime purchase totals."
        actions={
          <>
            <ExportButtons
              filename="rajathrifts-suppliers"
              disabled={!rows.length}
              sheets={() => [
                sheet({
                  name: 'Suppliers',
                  rows,
                  columns: [
                    { header: 'Supplier', value: (s) => s.name },
                    { header: 'Country', value: (s) => s.country },
                    { header: 'Contact', value: (s) => s.contact_name },
                    { header: 'Phone', value: (s) => s.phone },
                    { header: 'Email', value: (s) => s.email },
                    { header: 'Purchases', value: (s) => stats(s.id).count, kind: 'number' },
                    { header: 'Pairs bought', value: (s) => stats(s.id).pairs, kind: 'number' },
                    { header: 'Landed cost (PKR)', value: (s) => stats(s.id).landed, kind: 'money' },
                  ],
                }),
              ]}
            />
            <Button
              size="sm"
              variant="accent"
              onClick={() =>
                setEditing({
                  name: '',
                  country: '',
                  contact_name: '',
                  phone: '',
                  email: '',
                  notes: '',
                  is_active: true,
                })
              }
            >
              <Plus className="size-4" /> Add supplier
            </Button>
          </>
        }
      />
      {suppliers.error && (
        <Alert tone="error" className="mb-4">
          {suppliers.error.message}
        </Alert>
      )}

      <DataTable
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Supplier</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 text-right font-medium">Purchases</th>
            <th className="px-4 py-3 text-right font-medium">Pairs</th>
            <th className="px-4 py-3 text-right font-medium">Landed cost</th>
            <th className="w-16 px-4 py-3" />
          </tr>
        }
      >
        {suppliers.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {rows.map((s) => {
          const st = stats(s.id)
          return (
            <tr key={s.id} className={s.is_active ? undefined : 'opacity-60'}>
              <td className="px-4 py-2.5">
                <span className="text-bone">{s.name}</span>
                {!s.is_active && <Pill className="ml-2 border-bone/20 text-ink-subtle">Inactive</Pill>}
                <span className="block text-xs text-ink-subtle">{s.country}</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-ink-muted">
                {s.contact_name}
                {s.phone && <span className="block">{s.phone}</span>}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {st.count}
                {st.last && <span className="block text-xs text-ink-subtle">last {st.last}</span>}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{st.pairs}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{pkr(st.landed)}</td>
              <td className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  aria-label={`Edit ${s.name}`}
                  onClick={() => setEditing(s)}
                  className="rounded p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-bone"
                >
                  <Pencil className="size-4" />
                </button>
              </td>
            </tr>
          )
        })}
        {suppliers.data && rows.length === 0 && <TableMessage colSpan={6}>No suppliers yet.</TableMessage>}
      </DataTable>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? editing.name : 'Add supplier'}
        width="max-w-md"
      >
        {editing && (
          <SupplierForm key={editing.id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />
        )}
      </Drawer>
    </>
  )
}
