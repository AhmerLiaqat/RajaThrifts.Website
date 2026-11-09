import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DataTable, Drawer, DrawerSection, SearchBox, TableMessage, Tabs } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { NEXT_ORDER_STATUSES, PAYMENT_METHOD_META, PAYMENT_STATUS_META } from '@/constants/order'
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
import { formatDate, formatPrice } from '@/lib/utils/format'
import { orderService } from '@/services'
import type { OrderListFilter } from '@/services/orders/order.service'
import type { Order, OrderStatus, PaymentStatus } from '@/types/order'
import { useOrderReturns } from '../../hooks'
import { ReturnStatusPill } from '../../returns/ReturnStatusPill'

const FILTERS: Array<{ value: OrderListFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'To confirm' },
  { value: 'to_ship', label: 'To ship' },
  { value: 'shipped', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'unpaid', label: 'Delivered, unpaid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
]

/** Common Pakistani couriers; free text is allowed too. */
/** Buttons say what they do; badges say what the order is. */
const ORDER_ACTION_LABEL: Record<OrderStatus, string> = {
  pending: 'Mark pending',
  confirmed: 'Confirm order',
  processing: 'Start packing',
  shipped: 'Mark shipped',
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
    fulfilment: useMutation({
      mutationFn: (v: { id: string; courier: string; trackingNumber: string; staffNotes: string }) =>
        orderService.updateFulfilment(v.id, v),
      onSuccess: done,
    }),
  }
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
  const error = actions.status.error ?? actions.payment.error ?? actions.fulfilment.error
  const payOptions = (Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).filter(
    (s) => s !== 'refunded' || isAdmin,
  )

  return (
    <>
      {error && <Alert tone="error">{error.message}</Alert>}
      <OrderTimeline order={order} />

      <DrawerSection title="Move to">
        <div className="flex flex-wrap gap-2">
          {NEXT_ORDER_STATUSES[order.status].length === 0 && (
            <p className="text-sm text-ink-subtle">No further steps.</p>
          )}
          {NEXT_ORDER_STATUSES[order.status]
            .filter((s) => s !== 'refunded')
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
            <span className="text-xs text-ink-subtle">Shipped {formatDate(order.shippedAt)}</span>
          )}
          {order.deliveredAt && (
            <span className="text-xs text-ink-subtle">Delivered {formatDate(order.deliveredAt)}</span>
          )}
        </div>
      </DrawerSection>

      <DrawerSection title={`Payment · ${PAYMENT_METHOD_META[order.paymentMethod].label}`}>
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
          </tr>
        }
      >
        {orders.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {orders.data?.map((o) => (
          <tr key={o.id} onClick={() => setSelectedId(o.id)} className="cursor-pointer hover:bg-white/[0.03]">
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
          </tr>
        ))}
        {orders.data?.length === 0 && <TableMessage colSpan={6}>No orders here.</TableMessage>}
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
