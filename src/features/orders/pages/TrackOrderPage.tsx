import { useMutation } from '@tanstack/react-query'
import { CircleCheck, Clock, PackageSearch, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { env } from '@/config/env'
import { ORDER_STATUS_META } from '@/constants/order'
import { OrderStatusBadge, OrderTimeline } from '@/features/account/components/OrderBits'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { usePublicSettings } from '@/features/store/usePublicSettings'
import { formatDate, formatPrice, formatPriceCode } from '@/lib/utils/format'
import { orderService } from '@/services'
import { whatsappChatUrl } from '@/services/store/store.service'
import type { TrackedOrder } from '@/types/order'

function TrackedOrderCard({ order }: { order: TrackedOrder }) {
  const settings = usePublicSettings()
  const wa = settings.data?.whatsappNumber
  const paid = order.paymentStatus === 'paid'

  return (
    <section className="glass mt-10 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-wider text-ink-subtle uppercase">
            Placed {formatDate(order.placedAt)}
          </p>
          <p className="mt-1 font-mono text-3xl tracking-tight">{order.orderNumber}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {order.contactName} · {order.city}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6">
        <OrderTimeline order={order} />
        <p className="mt-4 text-sm text-ink-muted">{ORDER_STATUS_META[order.status].description}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <p className="flex items-center gap-2 rounded-xl border border-bone/10 px-4 py-3 text-sm">
          {paid ? <CircleCheck className="size-4 text-success" /> : <Clock className="size-4 text-warning" />}
          {paid
            ? 'Payment verified'
            : order.hasPaymentProof
              ? 'Payment screenshot received, being verified'
              : 'Waiting for payment'}
        </p>
        {(order.trackingNumber || order.courier) && (
          <p className="rounded-xl border border-bone/10 px-4 py-3 text-sm">
            {order.courier && <span className="text-ink-muted">{order.courier} · </span>}
            {order.trackingNumber ? (
              <span className="font-mono text-bone">{order.trackingNumber}</span>
            ) : (
              'Tracking number coming soon'
            )}
          </p>
        )}
      </div>

      <ul className="mt-6 divide-y divide-bone/10 border-y border-bone/10">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-4 py-3">
            {i.imageUrl ? (
              <img src={i.imageUrl} alt="" className="size-14 rounded-lg object-cover" />
            ) : (
              <span className="size-14 rounded-lg bg-surface-sunken" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-xs tracking-wider text-ink-subtle uppercase">{i.brandName}</span>
              <span className="block truncate text-sm">{i.productName}</span>
              <span className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                <CollectionBadge collection={i.collection} /> {i.sizeLabel} · Qty {i.quantity}
              </span>
            </span>
            <span className="font-display text-sm tabular-nums">{formatPrice(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</dd>
        </div>
        <div className="flex justify-between font-display text-base">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPriceCode(order.total)}</dd>
        </div>
      </dl>

      {wa && (
        <a
          href={whatsappChatUrl(wa, `Hi! I have a question about my order ${order.orderNumber}.`)}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm text-sand underline-offset-4 hover:underline"
        >
          Questions? Message us on WhatsApp →
        </a>
      )}
    </section>
  )
}

/** Guests track an order with its number and the phone number used at checkout. */
export default function TrackOrderPage() {
  const [params] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '')
  const [phone, setPhone] = useState('')
  const track = useMutation({ mutationFn: () => orderService.track(orderNumber, phone) })
  const valid = /^\s*RT-?\d+\s*$/i.test(orderNumber) && phone.replace(/\D/g, '').length >= 10

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <span className="grid size-12 place-items-center rounded-2xl bg-sand text-night">
        <PackageSearch className="size-6" />
      </span>
      <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
        Track your <span className="text-sand">order</span>
      </h1>
      <p className="mt-3 text-ink-muted">
        Enter your order number (e.g. RT-100012) and the phone number you used at checkout.
      </p>

      {!env.isSupabaseConfigured ? (
        <Alert tone="info" className="mt-8">
          Order tracking is available once the store is connected to its database.
        </Alert>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) track.mutate()
          }}
          className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Input
            label="Order number"
            placeholder="RT-100012"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          />
          <Input
            label="Phone number"
            type="tel"
            placeholder="0300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button type="submit" variant="accent" loading={track.isPending} disabled={!valid} className="h-12">
            <Search className="size-4" /> Track
          </Button>
        </form>
      )}

      {track.error && (
        <Alert tone="error" className="mt-6">
          {track.error.message}
        </Alert>
      )}
      {track.data && <TrackedOrderCard order={track.data} />}
    </div>
  )
}
