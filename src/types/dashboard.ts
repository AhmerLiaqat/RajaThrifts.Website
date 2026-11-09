import type { Collection } from '@/constants/collections'
import type { BrandRef, CategoryRef, Product, ProductStatus } from './product'
import type { ID, ISODateString, MinorUnits } from './common'

export interface StoreSettings {
  lowStockThreshold: number
  returnWindowDays: number
  updatedAt: ISODateString
}

export interface DashboardSummary {
  rangeDays: number
  startDate: string
  endDate: string
  lowStockThreshold: number
  sales: MinorUnits
  orders: number
  avgOrderValue: MinorUnits
  pairsSold: number
  grossMargin: MinorUnits
  /** Share (0–1) of sold items that have a purchase price recorded. */
  marginCoverage: number
  cancelled: number
  pendingOrders: number
  toShip: number
  inTransit: number
  unpaidDelivered: number
  openReturns: number
  inventory: {
    pairs: number
    listingsInStock: number
    retailValue: MinorUnits
    costValue: MinorUnits
    costCoverage: number
    lowStock: number
    soldOut: number
  }
  daily: Array<{ date: string; sales: MinorUnits; orders: number }>
  byStatus: Record<string, number>
  byCollection: Array<{ collection: Collection; pairs: number; sold: number }>
  topBrands: Array<{ brand: string; pairs: number; revenue: MinorUnits }>
}

/** Product as staff see it: includes the private purchase price. */
export interface AdminProduct extends Product {
  purchasePrice: MinorUnits | null
  supplierRef: string | null
}

export interface BrandWithCount extends BrandRef {
  productCount: number
}

export interface SizeChartRow {
  id: ID
  eu: string
  uk: string | null
  usMen: string | null
  usWomen: string | null
  footLengthCm: string | null
  isActive: boolean
}

/** One SKU (size of a product) in the inventory view. */
export interface InventoryRow {
  variantId: ID
  sku: string
  size: string
  quantity: number
  updatedAt: ISODateString
  product: {
    id: ID
    name: string
    slug: string
    brand: string
    collection: Collection
    status: ProductStatus
    category: CategoryRef | null
    imageUrl: string | null
    price: MinorUnits
  }
  /** Total pairs across all sizes of the product (drives low stock). */
  productStock: number
}

export interface CustomerSummary {
  id: ID
  fullName: string | null
  email: string | null
  phone: string | null
  city: string | null
  createdAt: ISODateString
  ordersCount: number
  totalSpent: MinorUnits
  lastOrderAt: ISODateString | null
  openReturns: number
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded'
export type ReturnReason =
  'wrong_size' | 'not_as_described' | 'defect_not_disclosed' | 'damaged_in_transit' | 'changed_mind' | 'other'

export interface ReturnRequest {
  id: ID
  returnNumber: string
  orderId: ID
  orderNumber: string | null
  orderItemId: ID
  userId: ID
  quantity: number
  reason: ReturnReason
  customerComment: string | null
  status: ReturnStatus
  restock: boolean
  refundAmount: MinorUnits | null
  staffNotes: string | null
  requestedAt: ISODateString
  decidedAt: ISODateString | null
  receivedAt: ISODateString | null
  refundedAt: ISODateString | null
  item: {
    productName: string
    brandName: string
    sizeLabel: string
    sku: string
    unitPrice: MinorUnits
    imageUrl: string | null
  } | null
  customer: { name: string; phone: string } | null
}
