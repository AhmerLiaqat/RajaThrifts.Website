import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order'

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; description: string }
> = {
  pending: {
    label: 'Pending',
    className: 'border-warning/25 bg-warning/10 text-warning',
    description: 'Waiting for us to verify your payment and confirm the order.',
  },
  confirmed: {
    label: 'Approved',
    className: 'border-info/25 bg-info/10 text-info',
    description: 'Payment verified and order approved. We are packing your pair.',
  },
  // Legacy step, shown as Approved: the store now uses Pending → Approved → Dispatched → Delivered.
  processing: {
    label: 'Approved',
    className: 'border-info/25 bg-info/10 text-info',
    description: 'Payment verified and order approved. We are packing your pair.',
  },
  shipped: {
    label: 'Dispatched',
    className: 'border-sand/25 bg-sand/10 text-sand',
    description: 'Handed to the courier and on its way to you.',
  },
  delivered: {
    label: 'Delivered',
    className: 'border-success/25 bg-success/10 text-success',
    description: 'Delivered. Enjoy the pair!',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-line bg-surface-sunken text-ink-muted',
    description: 'This order was cancelled.',
  },
  refunded: {
    label: 'Refunded',
    className: 'border-line bg-surface-sunken text-ink-muted',
    description: 'This order was refunded.',
  },
}

/** Next statuses staff may move an order to. Mirrors public.update_order_status(). */
export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

/** The four steps customers see when tracking an order. */
export const ORDER_TIMELINE: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered']

export const PAYMENT_METHOD_META: Record<
  PaymentMethod,
  { label: string; description: string; available: boolean }
> = {
  cod: { label: 'Cash on delivery', description: 'Pay in cash when your pair arrives.', available: true },
  bank_transfer: {
    label: 'Bank transfer',
    description: 'We share account details after confirming your order.',
    available: true,
  },
  easypaisa: {
    label: 'Easypaisa',
    description: 'We share the wallet number after confirming your order.',
    available: true,
  },
  jazzcash: {
    label: 'JazzCash',
    description: 'We share the wallet number after confirming your order.',
    available: true,
  },
  card: { label: 'Card', description: 'Coming soon.', available: false },
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Unpaid', className: 'text-warning' },
  paid: { label: 'Paid', className: 'text-success' },
  failed: { label: 'Failed / void', className: 'text-ink-muted' },
  refunded: { label: 'Refunded', className: 'text-ink-muted' },
}
