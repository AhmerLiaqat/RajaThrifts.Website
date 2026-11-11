import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, ExternalLink, ShieldCheck, Truck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DataTable, Drawer, DrawerSection, SearchBox, TableMessage, Tabs } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { NEXT_ORDER_STATUSES, ORDER_STATUS_META, PAYMENT_METHOD_META, PAYMENT_STATUS_META } from '@/constants/order'
import { WhatsAppGlyph } from '@/components/feedback/WhatsAppFloat'
import { customerWhatsappUrl } from '../whatsappMessage'
import { RETURN_REASON_LABEL } from '@/constants/returns'
import {
  OrderItemsList,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotals,
} from '@/features/account/components/OrderBits'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { queryKeys } from '@/lib/query/queryClient'
import { formatDate, formatPrice, formatPriceCode } from '@/lib/utils/format'
import { orderService } from '@/services'
import type { OrderListFilter } from '@/services/orders/order.service'
import type { Order, OrderStatus, PaymentStatus } from '@/types/order'
import { PaymentProofThumb } from '@/features/account/components/PaymentProof'
import { useOrderReturns } from '../../hooks'
import { ReturnStatusPill } from '../../returns/ReturnStatusPill'

const FILTERS: Array<{ value: OrderListFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'to_ship', label: 'Approved' },
  { value: 'shipped', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'unpaid', label: 'Delivered, unpaid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
]

/** Common Pakistani couriers; free text is allowed too. */
/** Buttons say what they do; badges say what the order is. */
const ORDER_ACTION_LABEL: Record<OrderStatus, string> = {
  pending: 'Mark pending',
  confirmed: 'Approve order',
  processing: 'Approve order',
  shipped: 'Mark dispatched',
  delivered: 'Mark delivered',
  cancelled: 'Cancel order',
  refunded: 'Mark refunded',
}

const COURIERS = ['TCS', 'Leopards', 'M&P', 'Trax', 'PostEx', 'BlueEX', 'Pakistan Post', 'Own rider']

function useOrderActions() {
  const qc = useQueryClient()
  const done = () => {
    for (const key of [queryKeys.orders.all, queryKeys.products.all, ['admin'], ['dashboard']])
      qc.invalidateQueries({ queryKey: key })
  }
  return {
    status: useMutation({
      mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
        orderService.updateStatus(id, status),
      onSuccess: done,
    }),
    payment: useMutation({
      mutationFn: ({ id, status, reference }: { id: string; status: PaymentStatus; reference?: string }) =>
        orderService.recordPayment(id, status, reference),
      onSuccess: done,
    }),
    approve: useMutation({
      mutationFn: ({ id, reference }: { id: string; reference?: string }) => orderService.approve(id, reference),
      onSuccess: done,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => orderService.reject(id, reason),
      onSuccess: done,
    }),
    fulfilment: useMutation({
      mutationFn: (v: { id: string; courier: string; trackingNumber: string; staffNotes: string }) =>
        orderService.updateFulfilment(v.id, v),
      onSuccess: done,
    }),
  }
}

/**
 * Advance-payment orders stay pending until an admin has checked the bank account.
 * The database enforces the same rule (migration 0011): only admins verify + approve.
 */
function ApprovalPanel({ order, actions }: { order: Order; actions: ReturnType<typeof useOrderActions> }) {
  const { isAdmin } = useAuth()
  const [checked, setChecked] = useState(false)
  const [reference, setReference] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('Payment not received in our account')
  const amount = formatPriceCode(order.total)

  return (
    <section className="rounded-2xl border border-warning/40 bg-warning/5 p-4 sm:p-5">
      <p className="flex items-center gap-2 font-display text-sm font-semibold text-warning">
        <ShieldCheck className="size-4" /> Waiting for payment verification
      </p>
      <div className="mt-4 flex items-start gap-4">
        {order.paymentProofPath ? (
          <PaymentProofThumb path={order.paymentProofPath} className="h-44 w-32 shrink-0" />
        ) : (
          <span className="grid h-44 w-32 shrink-0 place-items-center rounded-xl border border-dashed border-warning/50 p-2 text-center text-xs text-warning">
            No screenshot
          </span>
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-ink-muted">Amount to find in your bank account</p>
          <p className="mt-0.5 font-display text-2xl text-bone tabular-nums">{amount}</p>
          <p className="mt-2 text-xs text-ink-subtle">
            From {order.contactName} · {order.contactPhone}
            <br />
            Placed {formatDate(order.placedAt)}
          </p>
          {order.paymentProofPath && (
            <p className="mt-2 text-xs text-ink-subtle">Click the screenshot to open it full size.</p>
          )}
        </div>
      </div>

      {!isAdmin ? (
        <p className="mt-4 text-sm text-ink-muted">
          An admin checks the bank account and approves this order. You can pack it once it is confirmed.
        </p>
      ) : rejecting ? (
        <div className="mt-5 flex flex-col gap-3">
          <Input label="Reason (saved in staff notes)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={!reason.trim()}
              loading={actions.reject.isPending}
              onClick={() => actions.reject.mutate({ id: order.id, reason })}
            >
              <XCircle className="size-4" /> Reject order
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Back
            </Button>
          </div>
          <p className="text-xs text-ink-subtle">The order is cancelled and its pairs go back on sale.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-bone">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-sand"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            I checked my bank account and received {amount}.
          </label>
          <Input
            label="Bank transaction ID (optional)"
            placeholder="e.g. FT2611100123"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="accent"
              disabled={!checked}
              loading={actions.approve.isPending}
              onClick={() => actions.approve.mutate({ id: order.id, reference })}
            >
              <CircleCheck className="size-4" /> Approve order
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
              <XCircle className="size-4" /> Reject
            </Button>
          </div>
          <p className="text-xs text-ink-subtle">Approving marks the payment paid and confirms the order.</p>
        </div>
      )}
    </section>
  )
}

function OrderPanel({ order }: { order: Order }) {
  const { isAdmin } = useAuth()
  const actions = useOrderActions()
  const returns = useOrderReturns(order.id)
  const [payStatus, setPayStatus] = useState<PaymentStatus>(
    order.paymentStatus === 'pending' ? 'paid' : order.paymentStatus,
  )
  const [reference, setReference] = useState('')
  const [courier, setCourier] = useState(order.courier ?? '')
  const [tracking, setTracking] = useState(order.trackingNumber ?? '')
  const [notes, setNotes] = useState(order.staffNotes ?? '')
  const error =
    actions.status.error ??
    actions.payment.error ??
    actions.fulfilment.error ??
    actions.approve.error ??
    actions.reject.error
  const needsApproval = order.paymentMethod === 'bank_transfer' && order.status === 'pending'
  const payOptions = (Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).filter(
    (s) => s !== 'refunded' || isAdmin,
  )

  return (
    <>
      {error && <Alert tone="error">{error.message}</Alert>}
      {needsApproval && <ApprovalPanel order={order} actions={actions} />}
      <OrderTimeline order={order} />

      <DrawerSection title="Move to">
        <div className="flex flex-wrap gap-2">
          {NEXT_ORDER_STATUSES[order.status].length === 0 && (
            <p className="text-sm text-ink-subtle">No further steps.</p>
          )}
          {NEXT_ORDER_STATUSES[order.status]
            // Advance-payment orders are confirmed through Approve above, never directly.
            .filter((s) => s !== 'refunded' && !(needsApproval && s === 'confirmed'))
            .map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === 'cancelled' ? 'danger' : 'primary'}
                loading={actions.status.isPending && actions.status.variables?.status === s}
                onClick={() =>
                  (s !== 'cancelled' || window.confirm('Cancel this order and return its pairs to stock?')) &&
                  actions.status.mutate({ id: order.id, status: s })
                }
              >
                {s === 'shipped' ? <Truck className="size-3.5" /> : null}
                {ORDER_ACTION_LABEL[s]}
              </Button>
            ))}
        </div>
        {order.status === 'delivered' && (
          <p className="mt-2 text-xs text-ink-subtle">Returns and refunds are handled in Returns.</p>
        )}
      </DrawerSection>

      <a
        href={customerWhatsappUrl(order)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl bg-[#25D366] px-4 py-3 text-white shadow-sm transition-transform hover:scale-[1.01]"
      >
        <WhatsAppGlyph className="size-6 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Send WhatsApp message</span>
          <span className="block text-xs text-white/85">
            Order {order.orderNumber} · {ORDER_STATUS_META[order.status].label} · to {order.contactPhone}
          </span>
        </span>
      </a>

      <DrawerSection title="Customer">
        <p className="text-sm text-bone">
          {order.contactName} ·{' '}
          <a href={`tel:${order.contactPhone}`} className="underline underline-offset-4">
            {order.contactPhone}
          </a>
          {order.contactEmail && <> · {order.contactEmail}</>}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {[
            order.shippingAddress.line1,
            order.shippingAddress.line2,
            order.shippingAddress.city,
            order.shippingAddress.province,
            order.shippingAddress.postalCode,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
        {order.customerNotes && (
          <p className="mt-2 text-xs text-sand">Customer note: {order.customerNotes}</p>
        )}
        <Link
          to={`${paths.admin.customers}?q=${encodeURIComponent(order.contactEmail ?? order.contactPhone)}`}
          className="mt-2 inline-flex items-center gap-1 text-xs text-sand hover:underline"
        >
          Customer history <ExternalLink className="size-3" />
        </Link>
      </DrawerSection>

      <DrawerSection title="Items">
        <OrderItemsList order={order} />
        <div className="mt-4">
          <OrderTotals order={order} />
        </div>
      </DrawerSection>

      <DrawerSection title="Delivery">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Input
              label="Courier"
              list="couriers"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="TCS"
            />
            <datalist id="couriers">
              {COURIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </div>
        <div className="mt-3">
          <Textarea
            label="Staff notes (not shown to customer)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            loading={actions.fulfilment.isPending}
            onClick={() =>
              actions.fulfilment.mutate({
                id: order.id,
                courier,
                trackingNumber: tracking,
                staffNotes: notes,
              })
            }
          >
            Save delivery details
          </Button>
          {order.shippedAt && (
            <span className="text-xs text-ink-subtle">Dispatched {formatDate(order.shippedAt)}</span>
          )}
          {order.deliveredAt && (
            <span className="text-xs text-ink-subtle">Delivered {formatDate(order.deliveredAt)}</span>
          )}
        </div>
      </DrawerSection>

      <DrawerSection title={`Payment · ${PAYMENT_METHOD_META[order.paymentMethod].label}`}>
        {order.paymentMethod === 'bank_transfer' && !needsApproval && (
          <div className="mb-4 flex items-start gap-4">
            {order.paymentProofPath ? (
              <PaymentProofThumb path={order.paymentProofPath} className="h-36 w-28 shrink-0" />
            ) : (
              <span className="grid h-36 w-28 shrink-0 place-items-center rounded-xl border border-dashed border-warning/50 p-2 text-center text-xs text-warning">
                No screenshot yet
              </span>
            )}
            <p className="text-sm text-ink-muted">
              {order.paymentProofPath
                ? 'The customer’s transfer screenshot, kept for your records.'
                : 'The customer has not uploaded a transfer screenshot. Contact them before confirming.'}
              <span className="mt-2 block">
                Amount due: <strong className="text-bone">{formatPriceCode(order.total)}</strong>
              </span>
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Select
            label="Status"
            value={payStatus}
            onChange={(e) => setPayStatus(e.target.value as PaymentStatus)}
          >
            {payOptions.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Input
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Bank / wallet ref"
          />
          <Button
            size="sm"
            className="h-11"
            loading={actions.payment.isPending}
            onClick={() => actions.payment.mutate({ id: order.id, status: payStatus, reference })}
          >
            Record
          </Button>
        </div>
        {order.payments.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-ink-muted">
            {order.payments.map((p) => (
              <li key={p.id}>
                {PAYMENT_STATUS_META[p.status].label} · {formatPrice(p.amount)}
                {p.providerReference && ` · ${p.providerReference}`}
                {p.notes && ` · ${p.notes}`}
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>

      {!!returns.data?.length && (
        <DrawerSection title="Returns">
          <ul className="divide-y divide-bone/10">
            {returns.data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-mono">{r.returnNumber}</span>
                  <span className="block text-xs text-ink-subtle">
                    {r.item?.productName} ×{r.quantity} · {RETURN_REASON_LABEL[r.reason]}
                  </span>
                </span>
                <ReturnStatusPill status={r.status} />
              </li>
            ))}
          </ul>
          <Link to={paths.admin.returns} className="mt-2 inline-block text-xs text-sand hover:underline">
            Manage in Returns
          </Link>
        </DrawerSection>
      )}
    </>
  )
}

export default function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as OrderListFilter) ?? 'all'
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [debounced, setDebounced] = useState(search)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(id)
  }, [search])

  const filters = { status, search: debounced }
  const orders = useQuery({
    queryKey: queryKeys.orders.admin(filters),
    queryFn: () => orderService.listAll(filters),
  })
  const selected = orders.data?.find((o) => o.id === selectedId) ?? null

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Confirm, ship and collect payment. Cancelling before dispatch returns the pairs to stock automatically."
      />

      <div className="mb-4">
        <Tabs
          value={status}
          onChange={(v) => {
            const next = new URLSearchParams(params)
            if (v === 'all') next.delete('status')
            else next.set('status', v)
            setParams(next, { replace: true })
          }}
          options={FILTERS}
        />
      </div>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Order number, name or phone"
        className="mb-6 max-w-md"
      />

      {orders.error && (
        <Alert tone="error" className="mb-4">
          {orders.error.message}
        </Alert>
      )}

      <DataTable
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Delivery</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-right font-medium">Message</th>
          </tr>
        }
      >
        {orders.isPending && <TableMessage colSpan={7}>Loading…</TableMessage>}
        {orders.data?.map((o) => (
          <tr key={o.id} onClick={() => setSelectedId(o.id)} className="cursor-pointer hover:bg-surface-sunken">
            <td className="px-4 py-3">
              <button type="button" className="font-mono text-bone hover:text-sand">
                {o.orderNumber}
              </button>
              <p className="text-xs text-ink-subtle">{formatDate(o.placedAt)}</p>
            </td>
            <td className="px-4 py-3">
              <p>{o.contactName}</p>
              <p className="text-xs text-ink-subtle">
                {o.shippingAddress.city} · {o.contactPhone}
              </p>
            </td>
            <td className="px-4 py-3">
              <OrderStatusBadge status={o.status} />
              {o.status === 'pending' && o.paymentMethod === 'bank_transfer' && (
                <span className="mt-1 block text-xs text-warning">
                  {o.paymentProofPath ? 'Check payment' : 'No screenshot'}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-ink-muted">
              {o.courier || o.trackingNumber ? (
                <>
                  <p className="text-bone">{o.courier ?? '—'}</p>
                  <p className="font-mono">{o.trackingNumber}</p>
                </>
              ) : (
                '—'
              )}
            </td>
            <td className="px-4 py-3 text-xs">
              <span className={PAYMENT_STATUS_META[o.paymentStatus].className}>
                {PAYMENT_STATUS_META[o.paymentStatus].label}
              </span>
              <p className="text-ink-subtle">{PAYMENT_METHOD_META[o.paymentMethod].label}</p>
            </td>
            <td className="px-4 py-3 text-right tabular-nums">{formatPrice(o.total)}</td>
            <td className="px-4 py-3 text-right">
              <a
                href={customerWhatsappUrl(o)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`Send order ${o.orderNumber} (${ORDER_STATUS_META[o.status].label}) to ${o.contactPhone} on WhatsApp`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-semibold text-white hover:bg-[#1ebe5a]"
              >
                <WhatsAppGlyph className="size-4" /> Send
              </a>
            </td>
          </tr>
        ))}
        {orders.data?.length === 0 && <TableMessage colSpan={7}>No orders here.</TableMessage>}
      </DataTable>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={<span className="font-mono">{selected?.orderNumber}</span>}
        subtitle={
          selected && (
            <span className="inline-flex items-center gap-2">
              {formatDate(selected.placedAt)} <OrderStatusBadge status={selected.status} />
            </span>
          )
        }
      >
        {selected && (
          <OrderPanel key={`${selected.id}-${selected.status}-${selected.paymentStatus}`} order={selected} />
        )}
      </Drawer>
    </>
  )
}
