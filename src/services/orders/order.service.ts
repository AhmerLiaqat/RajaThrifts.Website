import { getSupabase } from '@/lib/supabase/client'
import type {
  OrderItemRow,
  OrderRow,
  OrderWithRelationsRow,
  PaymentRow,
  TrackedOrderRow,
} from '@/types/database'
import type {
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentStatus,
  PlaceAdvanceOrderInput,
  PlaceOrderInput,
  TrackedOrder,
} from '@/types/order'
import { check, fromPostgrestError, unwrap } from '../core/errors'
import { pkrToMinor } from '../core/money'
import { productImageUrl } from '../core/storage'

export type OrderListFilter = OrderStatus | 'all' | 'to_ship' | 'unpaid'

const ORDER_SELECT = '*, order_items(*), payments(*)'

const mapItem = (r: OrderItemRow): OrderItem => ({
  id: r.id,
  productId: r.product_id,
  variantId: r.variant_id,
  productName: r.product_name,
  brandName: r.brand_name,
  collection: r.collection,
  sizeLabel: r.size_label,
  sku: r.sku,
  imageUrl: r.image_path ? productImageUrl(r.image_path) : null,
  unitPrice: pkrToMinor(r.unit_price),
  quantity: r.quantity,
  lineTotal: pkrToMinor(r.line_total),
})

const mapPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  method: r.method,
  status: r.status,
  amount: pkrToMinor(r.amount),
  providerReference: r.provider_reference,
  notes: r.notes,
  paidAt: r.paid_at,
  createdAt: r.created_at,
})

export const mapOrder = (
  r: OrderRow & Partial<Pick<OrderWithRelationsRow, 'order_items' | 'payments'>>,
): Order => ({
  id: r.id,
  orderNumber: r.order_number,
  userId: r.user_id,
  status: r.status,
  paymentStatus: r.payment_status,
  paymentMethod: r.payment_method,
  subtotal: pkrToMinor(r.subtotal),
  shippingFee: pkrToMinor(r.shipping_fee),
  discountTotal: pkrToMinor(r.discount_total),
  total: pkrToMinor(r.total),
  contactName: r.contact_name,
  contactPhone: r.contact_phone,
  contactEmail: r.contact_email,
  shippingAddress: {
    line1: r.shipping_address_line1,
    line2: r.shipping_address_line2,
    city: r.shipping_city,
    province: r.shipping_province,
    postalCode: r.shipping_postal_code,
  },
  customerNotes: r.customer_notes,
  staffNotes: r.staff_notes,
  trackingNumber: r.tracking_number,
  courier: r.courier ?? null,
  placedAt: r.placed_at,
  confirmedAt: r.confirmed_at,
  shippedAt: r.shipped_at,
  deliveredAt: r.delivered_at,
  cancelledAt: r.cancelled_at,
  paymentProofPath: r.payment_proof_path ?? null,
  paymentProofUploadedAt: r.payment_proof_uploaded_at ?? null,
  items: (r.order_items ?? []).map(mapItem),
  payments: [...(r.payments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(mapPayment),
})

export const orderService = {
  /**
   * Checkout. Only variant ids and quantities are sent: prices, stock and totals are
   * computed and locked inside public.place_order() so the client cannot tamper with them.
   */
  async place(input: PlaceOrderInput): Promise<Order> {
    const row = unwrap<OrderRow>(
      await getSupabase().rpc('place_order', {
        p_items: input.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        p_contact: input.contact,
        p_address: {
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city,
          province: input.address.province,
          postal_code: input.address.postalCode,
        },
        p_payment_method: input.paymentMethod,
        p_customer_notes: input.notes ?? null,
      }),
    )
    return mapOrder(row)
  },

  /**
   * Storefront checkout: advance bank transfer. The screenshot must already be uploaded
   * (uploadPaymentProof); place_order_with_proof() verifies it and attaches it atomically.
   */
  async placeWithProof(input: PlaceAdvanceOrderInput): Promise<Order> {
    const row = unwrap<OrderRow>(
      await getSupabase().rpc('place_order_with_proof', {
        p_items: input.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        p_contact: input.contact,
        p_address: {
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city,
          province: input.address.province,
          postal_code: input.address.postalCode,
        },
        p_customer_notes: input.notes || null,
        p_payment_proof: input.paymentProofPath,
      }),
    )
    return mapOrder(row)
  },

  /** Guest order tracking: order number + the phone used at checkout (public.track_order). */
  async track(orderNumber: string, phone: string): Promise<TrackedOrder> {
    const r = unwrap<TrackedOrderRow>(
      await getSupabase().rpc('track_order', { p_order_number: orderNumber.trim(), p_phone: phone }),
    )
    return {
      orderNumber: r.order_number,
      status: r.status,
      paymentStatus: r.payment_status,
      paymentMethod: r.payment_method,
      hasPaymentProof: r.has_payment_proof,
      subtotal: pkrToMinor(r.subtotal),
      shippingFee: pkrToMinor(r.shipping_fee),
      discountTotal: pkrToMinor(r.discount_total),
      total: pkrToMinor(r.total),
      contactName: r.contact_name,
      contactPhone: r.contact_phone ?? null,
      addressLine1: r.shipping_address_line1 ?? null,
      addressLine2: r.shipping_address_line2 ?? null,
      province: r.shipping_province ?? null,
      city: r.shipping_city,
      courier: r.courier,
      trackingNumber: r.tracking_number,
      placedAt: r.placed_at,
      confirmedAt: r.confirmed_at,
      shippedAt: r.shipped_at,
      deliveredAt: r.delivered_at,
      cancelledAt: r.cancelled_at,
      items: r.items.map((i) => ({
        productName: i.product_name,
        brandName: i.brand_name,
        collection: i.collection,
        sizeLabel: i.size_label,
        imageUrl: i.image_path ? productImageUrl(i.image_path) : null,
        unitPrice: pkrToMinor(i.unit_price),
        quantity: i.quantity,
        lineTotal: pkrToMinor(i.line_total),
      })),
    }
  },

  /** Staff: every order from one customer (grouped by the last 10 digits of their phone). */
  async listByPhoneKey(phoneKey: string): Promise<Order[]> {
    const { data, error } = await getSupabase()
      .from('orders')
      .select(ORDER_SELECT)
      .eq('phone_key', phoneKey)
      .order('created_at', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as OrderWithRelationsRow[]).map(mapOrder)
  },

  /** Customer: replace the transfer screenshot while the order is still pending. */
  async setPaymentProof(orderId: string, path: string): Promise<void> {
    check(await getSupabase().rpc('set_payment_proof', { p_order_id: orderId, p_payment_proof: path }))
  },

  /** Staff: orders placed after a timestamp (new-order alerts). */
  async listSince(sinceIso: string): Promise<Order[]> {
    const { data, error } = await getSupabase()
      .from('orders')
      .select('*')
      .gt('placed_at', sinceIso)
      .order('placed_at', { ascending: true })
      .limit(20)
    if (error) throw fromPostgrestError(error)
    return (data as OrderRow[]).map(mapOrder)
  },

  /** Customer: own orders (RLS). Staff calling this see all, so pass userId to scope. */
  async listForUser(userId: string): Promise<Order[]> {
    const { data, error } = await getSupabase()
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as OrderWithRelationsRow[]).map(mapOrder)
  },

  async getByNumber(orderNumber: string): Promise<Order> {
    return mapOrder(
      unwrap<OrderWithRelationsRow>(
        await getSupabase().from('orders').select(ORDER_SELECT).eq('order_number', orderNumber).single(),
      ),
    )
  },

  async cancel(orderId: string, reason?: string): Promise<Order> {
    return mapOrder(
      unwrap<OrderRow>(
        await getSupabase().rpc('cancel_order', { p_order_id: orderId, p_reason: reason ?? null }),
      ),
    )
  },

  // ── Staff ────────────────────────────────────────────────────────────────
  /**
   * Staff order list. Besides real statuses, two delivery-queue filters:
   * 'to_ship' (confirmed + processing) and 'unpaid' (delivered, payment pending, e.g. COD to collect).
   */
  async listAll(filters: { status?: OrderListFilter; search?: string } = {}): Promise<Order[]> {
    let query = getSupabase()
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filters.status === 'to_ship') query = query.in('status', ['confirmed', 'processing'])
    else if (filters.status === 'unpaid')
      query = query.eq('status', 'delivered').eq('payment_status', 'pending')
    else if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    const term = filters.search?.replace(/[,()%*\\]/g, ' ').trim()
    if (term)
      query = query.or(
        `order_number.ilike.%${term}%,contact_name.ilike.%${term}%,contact_phone.ilike.%${term}%`,
      )
    const { data, error } = await query
    if (error) throw fromPostgrestError(error)
    return (data as OrderWithRelationsRow[]).map(mapOrder)
  },

  /** Admin: bank transfer verified → payment paid + order confirmed (public.approve_order). */
  async approve(orderId: string, reference?: string): Promise<void> {
    check(await getSupabase().rpc('approve_order', { p_order_id: orderId, p_reference: reference?.trim() || null }))
  },

  /** Admin: payment not received / invalid → order cancelled, pairs restocked (public.reject_order). */
  async reject(orderId: string, reason: string): Promise<void> {
    check(await getSupabase().rpc('reject_order', { p_order_id: orderId, p_reason: reason }))
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    check(await getSupabase().rpc('update_order_status', { p_order_id: orderId, p_status: status }))
  },

  async recordPayment(
    orderId: string,
    status: PaymentStatus,
    reference?: string,
    notes?: string,
  ): Promise<void> {
    check(
      await getSupabase().rpc('record_payment', {
        p_order_id: orderId,
        p_status: status,
        p_reference: reference ?? null,
        p_notes: notes ?? null,
      }),
    )
  },

  /** Column grants allow staff to change only tracking_number and staff_notes directly. */
  async updateFulfilment(
    orderId: string,
    patch: { trackingNumber?: string; staffNotes?: string; courier?: string },
  ): Promise<void> {
    const row: Record<string, string | null> = {}
    if ('trackingNumber' in patch) row.tracking_number = patch.trackingNumber?.trim() || null
    if ('staffNotes' in patch) row.staff_notes = patch.staffNotes?.trim() || null
    if ('courier' in patch) row.courier = patch.courier?.trim() || null
    check(await getSupabase().from('orders').update(row).eq('id', orderId))
  },
}
