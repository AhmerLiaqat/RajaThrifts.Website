import type { Collection } from '@/constants/collections'
import type { ID, ISODateString } from './common'
import type { ShoeSize } from './product'

/** Why stock changed. Mirrors public.movement_reason; every change is a ledger row. */
export type InventoryMovementReason =
  | 'intake' // new shipment received and graded
  | 'sale' // written by place_order() only
  | 'return'
  | 'adjustment' // manual correction / product editor edit
  | 'damaged'
  | 'released' // stock returned by a cancelled order

export interface InventoryMovement {
  id: ID
  variantId: ID
  /** Positive adds stock, negative removes it. */
  delta: number
  reason: InventoryMovementReason
  note: string | null
  /** Order that caused the movement, if any. */
  orderId: ID | null
  createdBy: ID | null
  createdAt: ISODateString
}

/** Imported stock usually arrives in bales/shipments. */
export interface Shipment {
  id: ID
  reference: string
  originCountry: string
  receivedAt: ISODateString | null
  /** Total landed cost in minor units, for margin reporting. */
  landedCost: number | null
  pairCount: number
  notes: string | null
}

/** Row in the admin inventory table. */
export interface InventoryItem {
  variantId: ID
  productId: ID
  productName: string
  brand: string
  collection: Collection
  sku: string
  size: ShoeSize
  quantity: number
  lowStock: boolean
  updatedAt: ISODateString
}

export interface StockAdjustmentInput {
  variantId: ID
  delta: number
  reason: InventoryMovementReason
  note?: string
}

export interface InventorySummary {
  totalPairs: number
  totalSkus: number
  outOfStock: number
  lowStock: number
  byCollection: Record<Collection, number>
}

export const LOW_STOCK_THRESHOLD = 1
