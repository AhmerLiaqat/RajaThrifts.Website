import { Check } from 'lucide-react'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import {
  ORDER_STATUS_META,
  ORDER_TIMELINE,
  PAYMENT_METHOD_META,
  PAYMENT_STATUS_META,
} from '@/constants/order'
import { cn } from '@/lib/utils/cn'
import { formatPrice, formatPriceCode } from '@/lib/utils/format'
import type { Order, OrderStatus } from '@/types/order'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-display text-[11px] tracking-wider whitespace-nowrap uppercase',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

/** Progress rail: Pending → Approved → Dispatched → Delivered. */
export function OrderTimeline({ order }: { order: Pick<Order, 'status'> }) {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return <p className="text-sm text-ink-muted">{ORDER_STATUS_META[order.status].description}</p>
  }
  // Legacy "processing" orders sit on the Approved step.
  const current = ORDER_TIMELINE.indexOf(order.status === 'processing' ? 'confirmed' : order.status)
  return (
    <ol className="grid grid-cols-4 gap-2">
      {ORDER_TIMELINE.map((s, i) => (
        <li key={s} className="flex flex-col gap-2">
          <span className={cn('h-1.5 rounded-full', i <= current ? 'bg-sand' : 'bg-line')} />
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-semibold',
              i <= current ? 'text-ink' : 'text-ink-subtle',
            )}
          >
            {i < current && <Check className="size-3 text-sand" />}
            {ORDER_STATUS_META[s].label}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function OrderItemsList({ order }: { order: Order }) {
  return (
    <ul className="divide-y divide-bone/10 border-y border-bone/10">
      {order.items.map((item) => (
        <li key={item.id} className="flex gap-4 py-4">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="aspect-[4/5] w-16 shrink-0 rounded-sm object-cover" />
          ) : (
            <div className="aspect-[4/5] w-16 shrink-0 rounded-sm bg-surface-sunken" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-wider text-ink-subtle uppercase">{item.brandName}</p>
            <p className="truncate font-display text-bone">{item.productName}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <CollectionBadge collection={item.collection} /> {item.sizeLabel} ·{' '}
              <span className="font-mono">{item.sku}</span> · Qty {item.quantity}
            </p>
          </div>
          <p className="font-display text-sm tabular-nums">{formatPrice(item.lineTotal)}</p>
        </li>
      ))}
    </ul>
  )
}

export function OrderTotals({ order }: { order: Order }) {
  const payment = order.payments[0]
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-muted">Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-muted">Delivery</dt>
        <dd className="tabular-nums">
          {order.shippingFee > 0 ? formatPrice(order.shippingFee) : 'Confirmed by our team'}
        </dd>
      </div>
      {order.discountTotal > 0 && (
        <div className="flex justify-between">
          <dt className="text-ink-muted">Discount</dt>
          <dd className="tabular-nums">−{formatPrice(order.discountTotal)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-bone/10 pt-3 font-display text-lg">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPriceCode(order.total)}</dd>
      </div>
      <div className="flex justify-between pt-1 text-xs">
        <dt className="text-ink-muted">{PAYMENT_METHOD_META[order.paymentMethod].label}</dt>
        <dd className={PAYMENT_STATUS_META[payment?.status ?? order.paymentStatus].className}>
          {PAYMENT_STATUS_META[payment?.status ?? order.paymentStatus].label}
        </dd>
      </div>
    </dl>
  )
}
