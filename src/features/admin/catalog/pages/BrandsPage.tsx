import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DataTable, SearchBox, TableMessage } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { useBrandMutations, useBrandsWithCounts } from '../hooks'

export default function BrandsPage() {
  const { isAdmin } = useAuth()
  const brands = useBrandsWithCounts()
  const { create, rename, remove } = useBrandMutations()
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

  const rows = (brands.data ?? []).filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
  const error = brands.error ?? create.error ?? rename.error ?? remove.error

  return (
    <>
      <AdminPageHeader
        title="Brands"
        description="Brands appear in storefront filters. Shopkeepers can add and rename; only admins can delete a brand, and only when no product uses it."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (newName.trim()) create.mutate(newName, { onSuccess: () => setNewName('') })
        }}
        className="mb-6 flex flex-col gap-3 sm:flex-row"
      >
        <SearchBox value={search} onChange={setSearch} placeholder="Search brands" className="sm:max-w-xs" />
        <div className="flex flex-1 gap-2 sm:justify-end">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New brand name"
            aria-label="New brand name"
            maxLength={60}
            className="h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3 text-sm focus:border-sand focus:outline-none sm:w-64"
          />
          <Button
            type="submit"
            variant="accent"
            className="h-11"
            loading={create.isPending}
            disabled={!newName.trim()}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </form>

      {error && (
        <Alert tone="error" className="mb-4">
          {error.message}
        </Alert>
      )}

      <DataTable
        minWidth={520}
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Brand</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 text-right font-medium">Products</th>
            <th className="w-32 px-4 py-3" />
          </tr>
        }
      >
        {brands.isPending && <TableMessage colSpan={4}>Loading…</TableMessage>}
        {rows.map((b) => (
          <tr key={b.id}>
            <td className="px-4 py-2.5">
              {editing?.id === b.id ? (
                <input
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') rename.mutate(editing, { onSuccess: () => setEditing(null) })
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  aria-label="Brand name"
                  className="h-9 w-full rounded border border-sand bg-surface-raised px-2 text-sm focus:outline-none"
                />
              ) : (
                <span className="text-bone">{b.name}</span>
              )}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-ink-subtle">{b.slug}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">
              {b.productCount > 0 ? (
                <Link to={`${paths.admin.products}?q=`} className="hover:text-sand">
                  {b.productCount}
                </Link>
              ) : (
                <span className="text-ink-subtle">0</span>
              )}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex justify-end gap-1">
                {editing?.id === b.id ? (
                  <>
                    <button
                      type="button"
                      aria-label="Save name"
                      onClick={() => rename.mutate(editing, { onSuccess: () => setEditing(null) })}
                      className="rounded p-1.5 text-success hover:bg-surface-sunken"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditing(null)}
                      className="rounded p-1.5 hover:bg-surface-sunken"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label={`Rename ${b.name}`}
                    onClick={() => setEditing({ id: b.id, name: b.name })}
                    className="rounded p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-bone"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={`Delete ${b.name}`}
                    disabled={b.productCount > 0 || remove.isPending}
                    title={b.productCount > 0 ? 'Used by products. Reassign them first.' : 'Delete brand'}
                    onClick={() => window.confirm(`Delete brand “${b.name}”?`) && remove.mutate(b.id)}
                    className="rounded p-1.5 text-danger hover:bg-danger/10 disabled:opacity-25"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {brands.data && rows.length === 0 && <TableMessage colSpan={4}>No brands match.</TableMessage>}
      </DataTable>
    </>
  )
}
