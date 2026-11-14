import { useMutation } from '@tanstack/react-query'
import {
  BadgeCheck,
  CircleCheck,
  Clock,
  Home,
  MapPin,
  PackageCheck,
  PackageSearch,
  Phone,
  Search,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WhatsAppGlyph } from '@/components/feedback/WhatsAppFloat'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { env } from '@/config/env'
import { CONTACT, shopPhoneUrl, shopWhatsappUrl } from '@/constants/contact'
import { ORDER_STATUS_META } from '@/constants/order'
import { OrderStatusBadge } from '@/features/account/components/OrderBits'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatPrice, formatPriceCode } from '@/lib/utils/format'
import { useSeo } from '@/lib/seo/useSeo'
import { orderService } from '@/services'
import type { TrackedOrder } from '@/types/order'

/** The four steps customers see: Pending → Approved → Dispatched → Delivered. */
function TrackingSteps({ order }: { order: TrackedOrder }) {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm">
        <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />
        <div>
          <p className="font-semibold text-ink">{ORDER_STATUS_META[order.status].label}</p>
          <p className="text-ink-muted">{ORDER_STATUS_META[order.status].description}</p>
        </div>
      </div>
    )
  }
  const steps = [
    { label: 'Pending', hint: 'Payment being checked', icon: Clock, at: order.placedAt },
    { label: 'Approved', hint: 'Order confirmed', icon: BadgeCheck, at: order.confirmedAt },
    { label: 'Dispatched', hint: 'With the courier', icon: Truck, at: order.shippedAt },
    { label: 'Delivered', hint: 'Enjoy your pair', icon: Home, at: order.deliveredAt },
  ]
  const current =
    order.status === 'delivered' ? 3 : order.status === 'shipped' ? 2 : order.status === 'pending' ? 0 : 1

  return (
    <ol className="grid grid-cols-4">
      {steps.map((s, i) => {
        const done = i <= current
        const Icon = s.icon
        return (
          <li key={s.label} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-5 right-1/2 h-1 w-full -translate-y-1/2 rounded-full',
                  i <= current ? 'bg-sand' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-10 place-items-center rounded-full ring-4 ring-white transition-colors',
                done ? 'bg-sand text-white' : 'bg-surface-sunken text-ink-subtle',
                i === current && 'shadow-[0_0_0_6px_rgb(36_53_138/0.15)]',
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className={cn('mt-2 text-xs font-bold sm:text-sm', done ? 'text-ink' : 'text-ink-subtle')}>
              {s.label}
            </span>
            <span className="hidden text-xs text-ink-subtle sm:block">
              {done && s.at ? formatDate(s.at) : s.hint}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Detail({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand-100 text-sand">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-subtle">{label}</p>
        <p className="text-sm font-semibold break-words text-ink">{children}</p>
      </div>
    </div>
  )
}

function TrackedOrderCard({ order }: { order: TrackedOrder }) {
  const paid = order.paymentStatus === 'paid'
  const address = [order.addressLine1, order.addressLine2, order.city, order.province].filter(Boolean).join(', ')

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface-sunken px-6 py-5">
        <div>
          <p className="text-xs font-medium text-ink-subtle">Order placed {formatDate(order.placedAt)}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink sm:text-3xl">{order.orderNumber}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="px-6 py-6">
        <TrackingSteps order={order} />
        <p className="mt-5 text-center text-sm text-ink-muted">{ORDER_STATUS_META[order.status].description}</p>
      </div>

      <div className="grid gap-6 border-t border-line px-6 py-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold text-ink">Delivery details</h2>
          <div className="mt-4 flex flex-col gap-4">
            <Detail icon={User} label="Name">
              {order.contactName}
            </Detail>
            {order.contactPhone && (
              <Detail icon={Phone} label="Phone">
                {order.contactPhone}
              </Detail>
            )}
            <Detail icon={MapPin} label="Address">
              {address || order.city}
            </Detail>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink">Payment & courier</h2>
          <div className="mt-4 flex flex-col gap-3">
            <p className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              {paid ? <CircleCheck className="size-4 text-success" /> : <Clock className="size-4 text-warning" />}
              {paid
                ? 'Payment verified'
                : order.hasPaymentProof
                  ? 'Payment screenshot received, being checked'
                  : 'Waiting for payment'}
            </p>
            <p className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              <PackageCheck className="size-4 text-sand" />
              {order.trackingNumber ? (
                <span>
                  {order.courier && <span className="text-ink-muted">{order.courier} · </span>}
                  <span className="font-mono font-semibold text-ink">{order.trackingNumber}</span>
                </span>
              ) : (
                <span className="text-ink-muted">Courier tracking number is added when the order is dispatched</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-line px-6 py-6">
        <h2 className="text-sm font-bold text-ink">Items</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-4 py-3">
              {i.imageUrl ? (
                <img src={i.imageUrl} alt="" className="size-16 rounded-xl bg-surface-sunken object-cover" />
              ) : (
                <span className="size-16 rounded-xl bg-surface-sunken" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold tracking-wide text-ink-subtle uppercase">{i.brandName}</span>
                <span className="block truncate text-sm font-semibold text-ink">{i.productName}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                  <CollectionBadge collection={i.collection} /> Size {i.sizeLabel} · Qty {i.quantity}
                </span>
              </span>
              <span className="text-sm font-bold text-ink tabular-nums">{formatPrice(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Delivery</dt>
            <dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</dd>
          </div>
          <div className="flex justify-between text-base font-bold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPriceCode(order.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-sunken px-6 py-4 text-sm">
        <span className="font-semibold text-ink">Questions?</span>
        <a
          href={shopWhatsappUrl(CONTACT.whatsapp[0], `Assalam o Alaikum! I have a question about my order ${order.orderNumber}.`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#25D366] px-3 font-semibold text-white"
        >
          <WhatsAppGlyph className="size-4" /> WhatsApp us
        </a>
        <a href={shopPhoneUrl()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-white px-3 font-semibold text-ink">
          <Phone className="size-4" /> Call {CONTACT.phone}
        </a>
      </div>
    </section>
  )
}

/** Customers (no account needed) track an order with its number and the phone used at checkout. */
export default function TrackOrderPage() {
  useSeo({ title: 'Track your order', description: 'Track your Raja Thrifts order with your order number and phone number.', path: '/track-order' })
  const [params] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '')
  const [phone, setPhone] = useState('')
  const track = useMutation({ mutationFn: () => orderService.track(orderNumber, phone) })
  const valid = /^\s*RT-?\d+\s*$/i.test(orderNumber) && phone.replace(/\D/g, '').length >= 10

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-navy text-gold shadow-[0_10px_24px_-10px_rgb(27_37_80/0.8)]">
          <PackageSearch className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Track your <span className="text-sand">order</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          Enter your order number (e.g. RT-100012) and the phone number you used at checkout.
        </p>
      </div>

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
          className="mt-8 grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-end"
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
          <Button type="submit" variant="accent" loading={track.isPending} disabled={!valid} className="h-11">
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
