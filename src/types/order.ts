import type { Collection } from '@/constants/collections'
import type { ID, ISODateString, MinorUnits } from './common'

export type OrderStatus =
  'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentMethod = 'cod' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'card'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItem {
  id: ID
  productId: ID | null
  variantId: ID | null
  productName: string
  brandName: string
  collection: Collection
  sizeLabel: string
  sku: string
  imageUrl: string | null
  unitPrice: MinorUnits
  quantity: number
  lineTotal: MinorUnits
}

export interface Payment {
  id: ID
  method: PaymentMethod
  status: PaymentStatus
  amount: MinorUnits
  providerReference: string | null
  notes: string | null
  paidAt: ISODateString | null
  createdAt: ISODateString
}

export interface Order {
  id: ID
  orderNumber: string
  /** null for guest orders. */
  userId: ID | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  subtotal: MinorUnits
  shippingFee: MinorUnits
  discountTotal: MinorUnits
  total: MinorUnits
  contactName: string
  contactPhone: string
  contactEmail: string | null
  shippingAddress: {
    line1: string
    line2: string | null
    city: string
    province: string | null
    postalCode: string | null
  }
  customerNotes: string | null
  staffNotes: string | null
  trackingNumber: string | null
  courier: string | null
  placedAt: ISODateString
  confirmedAt: ISODateString | null
  shippedAt: ISODateString | null
  deliveredAt: ISODateString | null
  cancelledAt: ISODateString | null
  /** Private storage path of the bank-transfer screenshot (payment-proofs bucket). */
  paymentProofPath: string | null
  paymentProofUploadedAt: ISODateString | null
  items: OrderItem[]
  payments: Payment[]
}

export interface PlaceOrderInput {
  items: Array<{ variantId: ID; quantity: number }>
  contact: { name: string; phone: string; email?: string }
  address: { line1: string; line2?: string; city: string; province?: string; postalCode?: string }
  paymentMethod: Exclude<PaymentMethod, 'card'>
  notes?: string
}

/** Storefront checkout: always an advance bank transfer with a screenshot already uploaded. */
export type PlaceAdvanceOrderInput = Omit<PlaceOrderInput, 'paymentMethod'> & { paymentProofPath: string }

/** What a guest sees when tracking an order (public.track_order): no address or phone. */
export interface TrackedOrder {
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  hasPaymentProof: boolean
  subtotal: MinorUnits
  shippingFee: MinorUnits
  discountTotal: MinorUnits
  total: MinorUnits
  contactName: string
  city: string
  courier: string | null
  trackingNumber: string | null
  placedAt: ISODateString
  confirmedAt: ISODateString | null
  shippedAt: ISODateString | null
  deliveredAt: ISODateString | null
  cancelledAt: ISODateString | null
  items: Array<{
    productName: string
    brandName: string
    collection: Collection
    sizeLabel: string
    imageUrl: string | null
    unitPrice: MinorUnits
    quantity: number
    lineTotal: MinorUnits
  }>
}
