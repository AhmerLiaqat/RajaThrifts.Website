import { useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DataTable, Drawer, DrawerSection, TableMessage, Tabs } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Textarea } from '@/components/ui/Field'
import { NEXT_RETURN_STATUSES, RETURN_REASON_LABEL, RETURN_STATUS_META } from '@/constants/returns'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { formatDate, formatPrice } from '@/lib/utils/format'
import type { ReturnRequest, ReturnStatus } from '@/types/dashboard'
import { useReturnMutations, useReturns } from '../../hooks'
import { ReturnStatusPill } from '../ReturnStatusPill'

type Filter = ReturnStatus | 'open' | 'all'
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

function ReturnPanel({ ret, onClose }: { ret: ReturnRequest; onClose: () => void }) {
  const { isAdmin } = useAuth()
  const { update } = useReturnMutations()
  const [restock, setRestock] = useState(ret.restock)
  const maxRefund = (ret.item?.unitPrice ?? 0) * ret.quantity
  const [refund, setRefund] = useState(String(maxRefund / 100))
  const [notes, setNotes] = useState('')

  const act = (status: ReturnStatus) =>
    update.mutate(
      {
        id: ret.id,
        status,
        restock: status === 'received' ? restock : undefined,
        refundAmount: status === 'refunded' ? Math.round(Number(refund) * 100) : undefined,
        notes: notes || undefined,
      },
      { onSuccess: onClose },
    )

  const next = NEXT_RETURN_STATUSES[ret.status]

  return (
    <>
      {update.error && <Alert tone="error">{update.error.message}</Alert>}

      <DrawerSection title="Item">
        <div className="flex gap-4">
          {ret.item?.imageUrl && (
            <img src={ret.item.imageUrl} alt="" className="size-20 rounded object-cover" />
          )}
          <div className="text-sm">
            <p className="text-bone">
              {ret.item?.brandName} {ret.item?.productName}
            </p>
            <p className="text-xs text-ink-muted">
              {ret.item?.sizeLabel} · <span className="font-mono">{ret.item?.sku}</span> · Qty {ret.quantity}
            </p>
            <p className="mt-1 text-xs text-ink-muted">Paid {formatPrice(maxRefund)}</p>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Customer request">
        <p className="text-sm text-bone">{RETURN_REASON_LABEL[ret.reason]}</p>
        {ret.customerComment && <p className="mt-1 text-sm text-ink-muted">“{ret.customerComment}”</p>}
        <p className="mt-2 text-xs text-ink-subtle">
          {ret.customer?.name} · {ret.customer?.phone} · order{' '}
          <Link
            to={`${paths.admin.orders}?q=${ret.orderNumber}`}
            className="font-mono text-sand hover:underline"
          >
            {ret.orderNumber}
          </Link>
        </p>
      </DrawerSection>

      {ret.staffNotes && (
        <DrawerSection title="Staff notes">
          <p className="text-sm whitespace-pre-line text-bone/85">{ret.staffNotes}</p>
        </DrawerSection>
      )}

      {next.length > 0 ? (
        <DrawerSection title="Next step">
          <div className="flex flex-col gap-4">
            {next.includes('received') && (
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={restock}
                  onChange={(e) => setRestock(e.target.checked)}
                  className="mt-0.5 accent-sand"
                />
                <span>
                  Put the pair back on sale when received
                  <span className="block text-xs text-ink-subtle">
                    Adds {ret.quantity} to stock and records it in the inventory ledger.
                  </span>
                </span>
              </label>
            )}
            {next.includes('refunded') && (
              <Input
                label="Refund amount (PKR)"
                inputMode="decimal"
                value={refund}
                onChange={(e) => setRefund(e.target.value)}
                hint={`Up to ${formatPrice(maxRefund)}. Recorded as a refund payment.`}
                disabled={!isAdmin}
              />
            )}
            <Textarea
              label="Note (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              {next.map((s) => {
                const adminOnly = s === 'refunded' && !isAdmin
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'rejected' ? 'danger' : s === 'refunded' ? 'accent' : 'primary'}
                    disabled={adminOnly}
                    title={adminOnly ? 'Only admins can issue refunds' : undefined}
                    loading={update.isPending && update.variables?.status === s}
                    onClick={() => (s !== 'rejected' || window.confirm('Reject this return?')) && act(s)}
                  >
                    {s === 'approved'
                      ? 'Approve'
                      : s === 'rejected'
                        ? 'Reject'
                        : s === 'received'
                          ? 'Mark received'
                          : 'Issue refund'}
                  </Button>
                )
              })}
            </div>
            {next.includes('refunded') && !isAdmin && (
              <p className="text-xs text-ink-subtle">
                Refunds are issued by an admin. Leave a note for them above.
              </p>
            )}
          </div>
        </DrawerSection>
      ) : (
        <p className="text-sm text-ink-muted">{RETURN_STATUS_META[ret.status].description}</p>
      )}

      <DrawerSection title="Timeline">
        <ul className="space-y-1 text-xs text-ink-muted">
          <li>Requested · {formatDate(ret.requestedAt)}</li>
          {ret.decidedAt && <li>Decided · {formatDate(ret.decidedAt)}</li>}
          {ret.receivedAt && (
            <li>
              Received · {formatDate(ret.receivedAt)}
              {ret.restock ? ' · restocked' : ''}
            </li>
          )}
          {ret.refundedAt && (
            <li>
              Refunded · {formatDate(ret.refundedAt)} ·{' '}
              {ret.refundAmount != null && formatPrice(ret.refundAmount)}
            </li>
          )}
        </ul>
      </DrawerSection>
    </>
  )
}

export default function ReturnsPage() {
  const [filter, setFilter] = useState<Filter>('open')
  const returns = useReturns(filter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = returns.data?.find((r) => r.id === selectedId) ?? null

  return (
    <>
      <AdminPageHeader
        title="Returns"
        description="Customers request returns from their order page after delivery. Approve, receive (optionally restocking), then an admin issues the refund."
      />
      <div className="mb-4">
        <Tabs value={filter} onChange={setFilter} options={FILTERS} />
      </div>
      {returns.error && (
        <Alert tone="error" className="mb-4">
          {returns.error.message}
        </Alert>
      )}

      <DataTable
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Return</th>
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        }
      >
        {returns.isPending && <TableMessage colSpan={5}>Loading…</TableMessage>}
        {returns.data?.map((r) => (
          <tr key={r.id} onClick={() => setSelectedId(r.id)} className="cursor-pointer hover:bg-surface-sunken">
            <td className="px-4 py-3">
              <button type="button" className="font-mono text-bone hover:text-sand">
                {r.returnNumber}
              </button>
              <p className="text-xs text-ink-subtle">{formatDate(r.requestedAt)}</p>
            </td>
            <td className="px-4 py-3">
              <p className="truncate">{r.item?.productName}</p>
              <p className="text-xs text-ink-subtle">
                {r.item?.sizeLabel} · ×{r.quantity}
              </p>
            </td>
            <td className="px-4 py-3 text-ink-muted">{RETURN_REASON_LABEL[r.reason]}</td>
            <td className="px-4 py-3">
              <p>{r.customer?.name}</p>
              <p className="font-mono text-xs text-ink-subtle">{r.orderNumber}</p>
            </td>
            <td className="px-4 py-3">
              <ReturnStatusPill status={r.status} />
            </td>
          </tr>
        ))}
        {returns.data?.length === 0 && <TableMessage colSpan={5}>No returns here.</TableMessage>}
      </DataTable>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={<span className="font-mono">{selected?.returnNumber}</span>}
        subtitle={selected && <ReturnStatusPill status={selected.status} />}
      >
        {selected && (
          <ReturnPanel
            key={`${selected.id}-${selected.status}`}
            ret={selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </Drawer>
    </>
  )
}
