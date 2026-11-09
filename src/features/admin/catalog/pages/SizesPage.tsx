import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DataTable, Pill, TableMessage } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import type { SizeInput } from '@/services/dashboard/dashboard.service'
import type { SizeChartRow } from '@/types/dashboard'
import { useSizeChart, useSizeMutations } from '../hooks'

const FIELDS: Array<{ key: keyof Omit<SizeInput, 'isActive'>; label: string }> = [
  { key: 'eu', label: 'EU' },
  { key: 'uk', label: 'UK' },
  { key: 'usMen', label: 'US men' },
  { key: 'usWomen', label: 'US women' },
  { key: 'footLengthCm', label: 'Foot cm' },
]

const SIZE_RE = /^\d{1,2}(\.5)?$/
const CM_RE = /^\d{1,2}(\.\d)?$/

function SizeRow({ size, isAdmin }: { size: SizeChartRow; isAdmin: boolean }) {
  const { update, remove } = useSizeMutations()
  const [draft, setDraft] = useState<SizeInput>(size)
  const dirty =
    FIELDS.some((f) => (draft[f.key] ?? '') !== (size[f.key] ?? '')) || draft.isActive !== size.isActive
  const valid = SIZE_RE.test(draft.eu) && (!draft.footLengthCm || CM_RE.test(draft.footLengthCm))

  return (
    <tr className={size.isActive ? undefined : 'opacity-60'}>
      {FIELDS.map((f) => (
        <td key={f.key} className="px-2 py-2">
          <input
            value={draft[f.key] ?? ''}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value || null })}
            inputMode="decimal"
            aria-label={`${f.label} for EU ${size.eu}`}
            className="h-9 w-full min-w-16 rounded border border-transparent bg-transparent px-2 text-sm tabular-nums hover:border-line-strong focus:border-sand focus:outline-none"
          />
        </td>
      ))}
      <td className="px-3 py-2">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            className="accent-[#C7B99A]"
          />
          {draft.isActive ? (
            <Pill className="border-success/40 text-success">Active</Pill>
          ) : (
            <Pill className="border-bone/20 text-ink-muted">Hidden</Pill>
          )}
        </label>
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          {dirty && (
            <Button
              size="sm"
              loading={update.isPending}
              disabled={!valid}
              onClick={() => update.mutate({ id: size.id, size: draft })}
            >
              Save
            </Button>
          )}
          {isAdmin && (
            <button
              type="button"
              aria-label={`Delete EU ${size.eu}`}
              onClick={() => window.confirm(`Delete EU ${size.eu} from the chart?`) && remove.mutate(size.id)}
              className="rounded p-1.5 text-danger hover:bg-danger/10"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        {(update.error || remove.error) && (
          <p className="mt-1 text-xs text-danger">{(update.error ?? remove.error)!.message}</p>
        )}
      </td>
    </tr>
  )
}

export default function SizesPage() {
  const { isAdmin } = useAuth()
  const sizes = useSizeChart()
  const { create } = useSizeMutations()
  const [draft, setDraft] = useState<SizeInput>({
    eu: '',
    uk: null,
    usMen: null,
    usWomen: null,
    footLengthCm: null,
    isActive: true,
  })

  return (
    <>
      <AdminPageHeader
        title="Size chart"
        description="Product sizes are chosen from this chart, and the database rejects sizes that are not in it. Conversions are shown to customers as a guide. Hide a size instead of deleting it."
      />
      {(sizes.error || create.error) && (
        <Alert tone="error" className="mb-4">
          {(sizes.error ?? create.error)!.message}
        </Alert>
      )}

      <DataTable
        minWidth={720}
        head={
          <tr>
            {FIELDS.map((f) => (
              <th key={f.key} className="px-4 py-3 font-medium">
                {f.label}
              </th>
            ))}
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="w-36 px-3 py-3" />
          </tr>
        }
      >
        {sizes.isPending && <TableMessage colSpan={7}>Loading…</TableMessage>}
        {sizes.data?.map((s) => (
          <SizeRow key={`${s.id}-${s.eu}-${s.isActive}`} size={s} isAdmin={isAdmin} />
        ))}
        <tr className="bg-white/[0.02]">
          {FIELDS.map((f) => (
            <td key={f.key} className="px-2 py-2">
              <input
                value={draft[f.key] ?? ''}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value || null })}
                placeholder={f.key === 'eu' ? 'e.g. 42.5' : '—'}
                inputMode="decimal"
                aria-label={`New size ${f.label}`}
                className="h-9 w-full min-w-16 rounded border border-line-strong bg-surface-raised px-2 text-sm focus:border-sand focus:outline-none"
              />
            </td>
          ))}
          <td className="px-3 py-2 text-xs text-ink-subtle">New size</td>
          <td className="px-3 py-2 text-right">
            <Button
              size="sm"
              variant="accent"
              loading={create.isPending}
              disabled={!SIZE_RE.test(draft.eu)}
              onClick={() =>
                create.mutate(draft, {
                  onSuccess: () =>
                    setDraft({
                      eu: '',
                      uk: null,
                      usMen: null,
                      usWomen: null,
                      footLengthCm: null,
                      isActive: true,
                    }),
                })
              }
            >
              <Plus className="size-3.5" /> Add
            </Button>
          </td>
        </tr>
      </DataTable>
    </>
  )
}
