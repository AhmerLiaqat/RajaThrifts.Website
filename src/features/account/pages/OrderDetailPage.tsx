import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { PageLoader } from '@/components/feedback/PageLoader'
import { Button } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { ORDER_STATUS_META, PAYMENT_METHOD_META } from '@/constants/order'
import NotFoundPage from '@/pages/NotFoundPage'
import { ServiceError } from '@/services'
import { formatDate } from '@/lib/utils/format'
import { OrderItemsList, OrderStatusBadge, OrderTimeline, OrderTotals } from '../components/OrderBits'
import { PaymentProofSection, WhatsAppOrderButton } from '../components/PaymentProof'
import { ReturnRequestSection } from '../components/ReturnRequestSection'
import { useCancelOrder, useOrder } from '../hooks'

export default function OrderDetailPage() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced
  const { data: order, isPending, error } = useOrder(orderNumber)
  const cancel = useCancelOrder()
  const [confirming, setConfirming] = useState(false)

  if (isPending) return <PageLoader />
  if (error instanceof ServiceError && error.code === 'NOT_FOUND') return <NotFoundPage />
  if (error || !order) return <Alert tone="error">{error?.message ?? 'Order unavailable'}</Alert>

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        to={paths.account}
        className="inline-flex items-center gap-2 text-xs text-ink-muted hover:text-bone"
      >
        <ArrowLeft className="size-3.5" /> All orders
      </Link>

      {justPlaced && (
        <Alert tone="success" title="Order placed. Thank you!" className="mt-6">
          <span className="inline-flex items-center gap-2">
            <PartyPopper className="size-4 text-sand" />
            {order.paymentMethod === 'bank_transfer'
              ? 'We’ll verify your payment and confirm your order shortly.'
              : `We’ll confirm your order shortly. ${PAYMENT_METHOD_META[order.paymentMethod].description}`}
          </span>
          <span className="mt-4 block">
            <WhatsAppOrderButton
              order={{
                ...order,
                city: order.shippingAddress.city,
                hasPaymentProof: !!order.paymentProofPath,
              }}
            />
          </span>
        </Alert>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Order · {formatDate(order.placedAt)}</p>
          <h1 className="mt-3 font-mono text-4xl tracking-tight sm:text-5xl">{order.orderNumber}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-8 rounded-xl border border-line bg-surface-raised shadow-card p-5">
        <OrderTimeline order={order} />
        <p className="mt-4 text-sm text-ink-muted">{ORDER_STATUS_META[order.status].description}</p>
        {order.trackingNumber && (
          <p className="mt-2 text-sm">
            Tracking number: <span className="font-mono text-bone">{order.trackingNumber}</span>
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-4 font-display text-xs tracking-wider uppercase">Items</h2>
          <OrderItemsList order={order} />
        </section>
        <aside className="space-y-8">
          <section className="rounded-sm border border-bone/10 p-5">
            <OrderTotals order={order} />
          </section>
          <section>
            <h2 className="mb-3 font-display text-xs tracking-wider uppercase">Delivery to</h2>
            <address className="text-sm leading-relaxed text-bone/85 not-italic">
              {order.contactName} · {order.contactPhone}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              )}
              <br />
              {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode]
                .filter(Boolean)
                .join(', ')}
            </address>
            {order.customerNotes && (
              <p className="mt-3 text-xs text-ink-muted">Note: {order.customerNotes}</p>
            )}
          </section>

          <PaymentProofSection order={order} />

          <ReturnRequestSection order={order} />

          {order.status === 'pending' && (
            <section className="border-t border-bone/10 pt-6">
              {cancel.error && (
                <Alert tone="error" className="mb-4">
                  {cancel.error.message}
                </Alert>
              )}
              {confirming ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-bone/85">Cancel this order? The pairs go back on sale.</p>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cancel.isPending}
                    onClick={() =>
                      cancel.mutate({ orderId: order.id }, { onSettled: () => setConfirming(false) })
                    }
                  >
                    Yes, cancel
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Keep order
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                  Cancel order
                </Button>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
