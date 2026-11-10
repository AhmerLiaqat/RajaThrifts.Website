import { motion } from 'framer-motion'
import { Check, Copy, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Sparkles } from '@/components/motion/Sparkles'
import { ButtonLink } from '@/components/ui'
import { WhatsAppOrderButton, type WhatsAppOrder } from '@/features/account/components/PaymentProof'
import { formatPrice, formatPriceCode } from '@/lib/utils/format'

/** Navigation state passed by checkout (the guest cannot read the order back from the database). */
export interface OrderConfirmedState {
  order: Omit<WhatsAppOrder, 'items'> & {
    subtotal: number
    shippingFee: number
    items: Array<WhatsAppOrder['items'][number] & { imageUrl: string | null; lineTotal: number }>
  }
}

const NEXT_STEPS = [
  { icon: ShieldCheck, title: 'We verify your payment', body: 'We match your screenshot with our bank account.' },
  { icon: PackageCheck, title: 'We confirm & pack', body: 'You get a confirmation call or WhatsApp message.' },
  { icon: Truck, title: 'On its way', body: 'Your pair is shipped with a tracking number.' },
]

/** Thank-you page after a guest (or signed-in) checkout. */
export default function OrderConfirmedPage() {
  const { orderNumber = '' } = useParams()
  const state = useLocation().state as OrderConfirmedState | null
  const order = state?.order?.orderNumber === orderNumber ? state.order : null
  const [copied, setCopied] = useState(false)

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <Sparkles count={14} seed={77} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sand text-night shadow-glow">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Thank you{order ? `, ${order.contactName.split(' ')[0]}` : ''}! <span className="text-sand">Order placed</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-ink-muted">
          We’ll verify your payment and confirm your order shortly. Keep your order number to track it.
        </p>

        <div className="glass mx-auto mt-8 inline-flex items-center gap-4 rounded-2xl px-6 py-4">
          <span className="text-left">
            <span className="block text-xs tracking-wider text-ink-subtle uppercase">Order number</span>
            <span className="block font-mono text-2xl tracking-tight text-bone">{orderNumber}</span>
          </span>
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard?.writeText(orderNumber).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-bone/15 px-3 py-1.5 text-xs text-ink-muted hover:border-sand hover:text-sand"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {order && <WhatsAppOrderButton order={order} />}
          <ButtonLink
            to={`${paths.trackOrder}?order=${encodeURIComponent(orderNumber)}`}
            variant="outline"
            className="glass h-12 border-line"
          >
            <Search className="size-4" /> Track this order
          </ButtonLink>
        </div>
        {order && (
          <p className="mt-3 text-xs text-ink-subtle">
            Sending the order on WhatsApp helps us confirm it faster.
          </p>
        )}
      </motion.div>

      <ol className="relative mt-14 grid gap-4 sm:grid-cols-3">
        {NEXT_STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="glass rounded-2xl p-5">
            <Icon className="size-5 text-sand" />
            <p className="mt-3 text-xs tracking-wider text-sand uppercase">Step {i + 1}</p>
            <p className="mt-1 font-display font-semibold">{title}</p>
            <p className="mt-1 text-sm text-ink-muted">{body}</p>
          </li>
        ))}
      </ol>

      {order && (
        <section className="glass relative mt-10 rounded-2xl p-6">
          <h2 className="font-display text-xs tracking-wider uppercase">Your order</h2>
          <ul className="mt-4 divide-y divide-bone/10">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex items-center gap-4 py-3">
                {i.imageUrl ? (
                  <img src={i.imageUrl} alt="" className="size-14 rounded-lg object-cover" />
                ) : (
                  <span className="size-14 rounded-lg bg-surface-sunken" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {i.brandName} {i.productName}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {i.sizeLabel} · Qty {i.quantity}
                  </span>
                </span>
                <span className="font-display text-sm tabular-nums">{formatPrice(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-bone/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Delivery</dt>
              <dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</dd>
            </div>
            <div className="flex justify-between font-display text-base">
              <dt>Total paid in advance</dt>
              <dd className="text-sand tabular-nums">{formatPriceCode(order.total)}</dd>
            </div>
          </dl>
        </section>
      )}

      <p className="relative mt-10 text-center text-sm">
        <Link to={paths.shop} className="text-sand underline-offset-4 hover:underline">
          Continue shopping →
        </Link>
      </p>
    </div>
  )
}
