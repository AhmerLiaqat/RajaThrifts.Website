/**
 * Raw Postgres row shapes (snake_case), as returned by Supabase/PostgREST.
 * Mirrors supabase/migrations. Only service-layer mappers touch these.
 *
 * Optional: generate types once the project exists and compare:
 *   npx supabase gen types typescript --project-id <ref> > src/types/supabase.gen.ts
 *
 * PostgREST serialises numeric(12,2) as a JSON number; mappers still accept
 * strings (via Number()) to stay safe across client versions.
 */
import type { Collection } from '@/constants/collections'
import type { UserRole } from './auth'
import type { InventoryMovementReason } from './inventory'
import type { OrderStatus, PaymentMethod, PaymentStatus } from './order'
import type {
  ConditionGrade,
  Gender,
  ProductDefect,
  ProductImageView,
  ProductStatus,
  SizeSystem,
} from './product'

/** numeric(12,2) PKR as delivered over the wire. */
export type NumericPkr = number | string

export interface ProfileRow {
  id: string
  role: UserRole
  email: string | null
  full_name: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  created_at: string
  updated_at: string
}

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description?: string | null
  sort_order?: number
}

export interface BrandRow {
  id: string
  name: string
  slug: string
}

export interface ProductRow {
  id: string
  slug: string
  name: string
  brand_id: string
  category_id: string | null
  model: string | null
  description: string
  collection: Collection
  gender: Gender
  condition: ConditionGrade
  condition_notes: string | null
  defects: ProductDefect[]
  origin_country: string | null
  color: string | null
  price: NumericPkr
  compare_at_price: NumericPkr | null
  status: ProductStatus
  is_featured: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProductImageRow {
  id: string
  product_id: string
  storage_path: string
  alt: string
  view: ProductImageView
  position: number
  created_at: string
}

export interface ProductVariantRow {
  id: string
  product_id: string
  sku: string
  size_system: SizeSystem
  size_value: string
  quantity: number
  price_override: NumericPkr | null
  created_at: string
  updated_at: string
}

export interface InventoryMovementRow {
  id: string
  variant_id: string
  delta: number
  reason: InventoryMovementReason
  note: string | null
  order_id: string | null
  created_by: string | null
  created_at: string
}

/** Product row with embedded relations, as selected by the product services. */
export interface ProductWithRelationsRow extends ProductRow {
  brand: BrandRow | null
  category: CategoryRow | null
  product_images: ProductImageRow[]
  product_variants: ProductVariantRow[]
}

export interface OrderRow {
  id: string
  order_number: string
  user_id: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  currency: 'PKR'
  subtotal: NumericPkr
  shipping_fee: NumericPkr
  discount_total: NumericPkr
  total: NumericPkr
  contact_name: string
  contact_phone: string
  contact_email: string | null
  shipping_address_line1: string
  shipping_address_line2: string | null
  shipping_city: string
  shipping_province: string | null
  shipping_postal_code: string | null
  customer_notes: string | null
  staff_notes: string | null
  tracking_number: string | null
  courier: string | null
  placed_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  payment_proof_path?: string | null
  payment_proof_uploaded_at?: string | null
  created_at: string
  updated_at: string
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  brand_name: string
  collection: Collection
  size_label: string
  sku: string
  image_path: string | null
  unit_price: NumericPkr
  quantity: number
  line_total: NumericPkr
  created_at: string
}

export interface PaymentRow {
  id: string
  order_id: string
  method: PaymentMethod
  status: PaymentStatus
  amount: NumericPkr
  currency: 'PKR'
  provider_reference: string | null
  notes: string | null
  paid_at: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export interface OrderWithRelationsRow extends OrderRow {
  order_items: OrderItemRow[]
  payments: PaymentRow[]
}

export interface WishlistRow {
  id: string
  user_id: string
  product_id: string
  created_at: string
}

/** jsonb returned by public.track_order(). */
export interface TrackedOrderRow {
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  has_payment_proof: boolean
  subtotal: NumericPkr
  shipping_fee: NumericPkr
  discount_total: NumericPkr
  total: NumericPkr
  contact_name: string
  shipping_city: string
  courier: string | null
  tracking_number: string | null
  placed_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  items: Array<{
    product_name: string
    brand_name: string
    collection: Collection
    size_label: string
    image_path: string | null
    unit_price: NumericPkr
    quantity: number
    line_total: NumericPkr
  }>
}
