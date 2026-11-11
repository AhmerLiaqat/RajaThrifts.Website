import { paths } from '@/app/router/paths'
import { CONTACT } from '@/constants/contact'
import { ORDER_STATUS_META } from '@/constants/order'
import { formatPrice, formatPriceCode } from '@/lib/utils/format'
import { normaliseWhatsappNumber } from '@/lib/utils/whatsapp'
import type { Order } from '@/types/order'

const STATUS_LINE: Record<Order['status'], string> = {
  pending: 'We have received your order and are checking your payment screenshot.',
  confirmed: 'Your payment is verified and your order is APPROVED. We are packing your pair now.',
  processing: 'Your payment is verified and your order is APPROVED. We are packing your pair now.',
  shipped: 'Good news! Your order has been DISPATCHED and is on its way to you.',
  delivered: 'Your order has been DELIVERED. We hope you love your pair!',
  cancelled: 'Your order has been cancelled. Please message us if you have any questions.',
  refunded: 'Your order has been refunded.',
}

/** The WhatsApp message an admin sends a customer about their order (order number + status + details). */
export function customerOrderMessage(order: Order) {
  const first = order.contactName.trim().split(/\s+/)[0] ?? ''
  const address = [
    order.shippingAddress.line1,
    order.shippingAddress.line2,
    order.shippingAddress.city,
    order.shippingAddress.province,
  ]
    .filter(Boolean)
    .join(', ')
  const trackUrl = `${window.location.origin}${paths.trackOrder}?order=${encodeURIComponent(order.orderNumber)}`

  return [
    `Assalam o Alaikum ${first}!`,
    '',
    `*Raja Thrifts* - Order *${order.orderNumber}*`,
    `Status: *${ORDER_STATUS_META[order.status].label}*`,
    STATUS_LINE[order.status],
    '',
    ...order.items.map(
      (i) => `- ${i.brandName} ${i.productName}, Size ${i.sizeLabel} x ${i.quantity}: ${formatPrice(i.lineTotal)}`,
    ),
    `Delivery: ${order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}`,
    `*Total: ${formatPriceCode(order.total)}*`,
    '',
    `Name: ${order.contactName}`,
    `Phone: ${order.contactPhone}`,
    `Address: ${address}`,
    ...(order.status === 'shipped' && (order.courier || order.trackingNumber)
      ? ['', `Courier: ${order.courier ?? '-'}`, `Tracking number: ${order.trackingNumber ?? 'coming soon'}`]
      : []),
    '',
    `Track your order: ${trackUrl}`,
    '',
    `Questions? WhatsApp ${CONTACT.whatsapp.join(' / ')} or call ${CONTACT.phone}.`,
    'Thank you for shopping with Raja Thrifts!',
  ].join('\n')
}

/** wa.me link that opens a chat with the customer, pre-filled with the order message. */
export function customerWhatsappUrl(order: Order) {
  return `https://wa.me/${normaliseWhatsappNumber(order.contactPhone)}?text=${encodeURIComponent(customerOrderMessage(order))}`
}
