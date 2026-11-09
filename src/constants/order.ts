import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order'

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; description: string }
> = {
  pending: {
    label: 'Pending',
    className: 'border-warning/40 text-warning',
    description: 'Waiting for our team to confirm.',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'border-info/40 text-info',
    description: 'Confirmed and reserved for you.',
  },
  processing: {
    label: 'Processing',
    className: 'border-info/40 text-info',
    description: 'Being cleaned and packed.',
  },
  shipped: { label: 'Shipped', className: 'border-sand/50 text-sand', description: 'On its way to you.' },
  delivered: {
    label: 'Delivered',
    className: 'border-success/40 text-success',
    description: 'Delivered. Enjoy the pair!',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-bone/20 text-ink-muted',
    description: 'This order was cancelled.',
  },
  refunded: {
    label: 'Refunded',
    className: 'border-bone/20 text-ink-muted',
    description: 'This order was refunded.',
  },
}

/** Next statuses staff may move an order to. Mirrors public.update_order_status(). */
export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

export const ORDER_TIMELINE: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

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
