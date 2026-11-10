/**
 * Shopkeeper dashboard data access. Every call is authorised in the database:
 * RLS for tables, role checks inside SECURITY DEFINER functions (see migration 0006).
 */
import { getSupabase } from '@/lib/supabase/client'
import type { Collection } from '@/constants/collections'
import type { NumericPkr, OrderItemRow, ProductImageRow } from '@/types/database'
import type {
  BrandWithCount,
  CustomerSummary,
  DashboardSummary,
  InventoryRow,
  ReturnReason,
  ReturnRequest,
  ReturnStatus,
  SizeChartRow,
  StoreSettings,
} from '@/types/dashboard'
import type { ProductStatus } from '@/types/product'
import { check, fromPostgrestError, unwrap } from '../core/errors'
import { mapPublicSettings, type PublicSettingsRow } from '../store/store.service'
import { minorToPkr, pkrToMinor, pkrToMinorOrNull } from '../core/money'
import { productImageUrl } from '../core/storage'
import { slugify } from '../products/admin-product.service'

const clean = (s?: string) => s?.replace(/[,()%*\\]/g, ' ').trim() || ''
const num = (v: NumericPkr | null | undefined) => (v == null ? null : String(Number(v)))

// ── Overview & settings ───────────────────────────────────────────────────────
interface SummaryJson {
  range_days: number
  start_date: string
  end_date: string
  low_stock_threshold: number
  sales: NumericPkr
  orders: number
  avg_order_value: NumericPkr
  pairs_sold: number
  gross_margin: NumericPkr
  margin_coverage: NumericPkr
  cancelled: number
  pending_orders: number
  to_ship: number
  in_transit: number
  unpaid_delivered: number
  open_returns: number
  inventory: {
    pairs: number
    listings_in_stock: number
    retail_value: NumericPkr
    cost_value: NumericPkr
    cost_coverage: NumericPkr
    low_stock: number
    sold_out: number
  }
  daily: Array<{ date: string; sales: NumericPkr; orders: number }> | null
  by_status: Record<string, number>
  by_collection: Array<{ collection: Collection; pairs: number; sold: number }>
  top_brands: Array<{ brand: string; pairs: number; revenue: NumericPkr }>
}

export const dashboardService = {
  async summary(days: number): Promise<DashboardSummary> {
    const s = unwrap<SummaryJson>(await getSupabase().rpc('dashboard_summary', { p_days: days }))
    return {
      rangeDays: s.range_days,
      startDate: s.start_date,
      endDate: s.end_date,
      lowStockThreshold: s.low_stock_threshold,
      sales: pkrToMinor(s.sales),
      orders: Number(s.orders),
      avgOrderValue: pkrToMinor(s.avg_order_value),
      pairsSold: Number(s.pairs_sold),
      grossMargin: pkrToMinor(s.gross_margin),
      marginCoverage: Number(s.margin_coverage),
      cancelled: Number(s.cancelled),
      pendingOrders: Number(s.pending_orders),
      toShip: Number(s.to_ship),
      inTransit: Number(s.in_transit),
      unpaidDelivered: Number(s.unpaid_delivered),
      openReturns: Number(s.open_returns),
      inventory: {
        pairs: Number(s.inventory.pairs),
        listingsInStock: Number(s.inventory.listings_in_stock),
        retailValue: pkrToMinor(s.inventory.retail_value),
        costValue: pkrToMinor(s.inventory.cost_value),
        costCoverage: Number(s.inventory.cost_coverage),
        lowStock: Number(s.inventory.low_stock),
        soldOut: Number(s.inventory.sold_out),
      },
      daily: (s.daily ?? []).map((d) => ({
        date: d.date,
        sales: pkrToMinor(d.sales),
        orders: Number(d.orders),
      })),
      byStatus: s.by_status ?? {},
      byCollection: (s.by_collection ?? []).map((c) => ({
        ...c,
        pairs: Number(c.pairs),
        sold: Number(c.sold),
      })),
      topBrands: (s.top_brands ?? []).map((b) => ({
        brand: b.brand,
        pairs: Number(b.pairs),
        revenue: pkrToMinor(b.revenue),
      })),
    }
  },

  async settings(): Promise<StoreSettings> {
    const r = unwrap<
      PublicSettingsRow & { low_stock_threshold: number; return_window_days: number; updated_at: string }
    >(await getSupabase().from('store_settings').select('*').single())
    return {
      ...mapPublicSettings(r),
      lowStockThreshold: r.low_stock_threshold,
      returnWindowDays: r.return_window_days,
      updatedAt: r.updated_at,
    }
  },

  /** Admin only (RLS). Zero rows updated means the caller is not an admin. */
  async updateSettings(
    patch: Omit<StoreSettings, 'updatedAt'>,
  ): Promise<void> {
    const blank = (v: string | null) => (v?.trim() ? v.trim() : null)
    const { data, error } = await getSupabase()
      .from('store_settings')
      .update({
        low_stock_threshold: patch.lowStockThreshold,
        return_window_days: patch.returnWindowDays,
        bank_name: blank(patch.bankName),
        bank_account_title: blank(patch.bankAccountTitle),
        bank_account_number: blank(patch.bankAccountNumber),
        bank_iban: blank(patch.bankIban)?.replace(/\s+/g, '').toUpperCase() ?? null,
        payment_instructions: blank(patch.paymentInstructions),
        whatsapp_number: blank(patch.whatsappNumber),
        whatsapp_group_url: blank(patch.whatsappGroupUrl),
        delivery_charge: patch.deliveryCharge / 100,
        free_delivery_threshold: patch.freeDeliveryThreshold === null ? null : patch.freeDeliveryThreshold / 100,
      })
      .eq('id', true)
      .select('id')
    if (error) throw fromPostgrestError(error)
    if (!data?.length) throw new Error('Only admins can change store settings.')
  },
}

// ── Brands ────────────────────────────────────────────────────────────────────
export const brandService = {
  async list(): Promise<BrandWithCount[]> {
    const { data, error } = await getSupabase()
      .from('brands')
      .select('id, name, slug, products(count)')
      .order('name')
    if (error) throw fromPostgrestError(error)
    return (
      data as Array<{ id: string; name: string; slug: string; products: Array<{ count: number }> }>
    ).map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      productCount: b.products?.[0]?.count ?? 0,
    }))
  },
  async create(name: string) {
    check(
      await getSupabase()
        .from('brands')
        .insert({ name: name.trim(), slug: slugify(name) }),
    )
  },
  async rename(id: string, name: string) {
    check(
      await getSupabase()
        .from('brands')
        .update({ name: name.trim(), slug: slugify(name) })
        .eq('id', id),
    )
  },
  /** Admin only; the database refuses while products still use the brand. */
  async remove(id: string) {
    const { data, error } = await getSupabase().from('brands').delete().eq('id', id).select('id')
    if (error) throw fromPostgrestError(error)
    if (!data?.length) throw new Error('Only admins can delete brands.')
  },
}

// ── Size chart ────────────────────────────────────────────────────────────────
interface SizeRow {
  id: string
  eu: NumericPkr
  uk: NumericPkr | null
  us_men: NumericPkr | null
  us_women: NumericPkr | null
  foot_length_cm: NumericPkr | null
  is_active: boolean
}
export type SizeInput = Omit<SizeChartRow, 'id'>

const sizeToRow = (s: SizeInput) => ({
  eu: Number(s.eu),
  uk: s.uk ? Number(s.uk) : null,
  us_men: s.usMen ? Number(s.usMen) : null,
  us_women: s.usWomen ? Number(s.usWomen) : null,
  foot_length_cm: s.footLengthCm ? Number(s.footLengthCm) : null,
  is_active: s.isActive,
})

export const sizeService = {
  async list(): Promise<SizeChartRow[]> {
    const { data, error } = await getSupabase().from('shoe_sizes').select('*').order('eu')
    if (error) throw fromPostgrestError(error)
    return (data as SizeRow[]).map((r) => ({
      id: r.id,
      eu: num(r.eu)!,
      uk: num(r.uk),
      usMen: num(r.us_men),
      usWomen: num(r.us_women),
      footLengthCm: num(r.foot_length_cm),
      isActive: r.is_active,
    }))
  },
  async create(s: SizeInput) {
    check(await getSupabase().from('shoe_sizes').insert(sizeToRow(s)))
  },
  async update(id: string, s: SizeInput) {
    check(await getSupabase().from('shoe_sizes').update(sizeToRow(s)).eq('id', id))
  },
  async remove(id: string) {
    const { data, error } = await getSupabase().from('shoe_sizes').delete().eq('id', id).select('id')
    if (error) throw fromPostgrestError(error)
    if (!data?.length) throw new Error('Only admins can delete sizes. Deactivate it instead.')
  },
}

// ── Inventory & SKUs ──────────────────────────────────────────────────────────
interface VariantJoinRow {
  id: string
  sku: string
  size_value: string
  quantity: number
  updated_at: string
  product: {
    id: string
    name: string
    slug: string
    collection: Collection
    status: ProductStatus
    price: NumericPkr
    brand: { name: string } | null
    category: { id: string; name: string; slug: string } | null
    product_images: Pick<ProductImageRow, 'storage_path' | 'position'>[]
    product_variants: Array<{ quantity: number }>
  } | null
}

export const inventoryAdminService = {
  async list(): Promise<InventoryRow[]> {
    const { data, error } = await getSupabase()
      .from('product_variants')
      .select(
        'id, sku, size_value, quantity, updated_at, product:products(id, name, slug, collection, status, price, brand:brands(name), category:categories(id, name, slug), product_images(storage_path, position), product_variants(quantity))',
      )
      .order('sku')
    if (error) throw fromPostgrestError(error)
    return (data as unknown as VariantJoinRow[])
      .filter((r) => r.product)
      .map((r) => {
        const p = r.product!
        const img = [...p.product_images].sort((a, b) => a.position - b.position)[0]
        return {
          variantId: r.id,
          sku: r.sku,
          size: r.size_value,
          quantity: r.quantity,
          updatedAt: r.updated_at,
          productStock: p.product_variants.reduce((n, v) => n + v.quantity, 0),
          product: {
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand?.name ?? '—',
            collection: p.collection,
            status: p.status,
            category: p.category,
            imageUrl: img ? productImageUrl(img.storage_path) : null,
            price: pkrToMinor(p.price),
          },
        }
      })
  },

  async updateSku(variantId: string, sku: string) {
    check(
      await getSupabase()
        .from('product_variants')
        .update({ sku: sku.trim().toUpperCase() })
        .eq('id', variantId),
    )
  },
}

// ── Customers ─────────────────────────────────────────────────────────────────
interface CustomerRow {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  created_at: string
  orders_count: number
  total_spent: NumericPkr
  last_order_at: string | null
  open_returns: number
}

export const customerService = {
  async list(search?: string): Promise<CustomerSummary[]> {
    const { data, error } = await getSupabase().rpc('customer_summaries', {
      p_search: clean(search) || null,
      p_limit: 200,
    })
    if (error) throw fromPostgrestError(error)
    return (data as CustomerRow[]).map((c) => ({
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      createdAt: c.created_at,
      ordersCount: Number(c.orders_count),
      totalSpent: pkrToMinor(c.total_spent),
      lastOrderAt: c.last_order_at,
      openReturns: Number(c.open_returns),
    }))
  },
}

// ── Returns ───────────────────────────────────────────────────────────────────
interface ReturnJoinRow {
  id: string
  return_number: string
  order_id: string
  order_item_id: string
  user_id: string
  quantity: number
  reason: ReturnReason
  customer_comment: string | null
  status: ReturnStatus
  restock: boolean
  refund_amount: NumericPkr | null
  staff_notes: string | null
  requested_at: string
  decided_at: string | null
  received_at: string | null
  refunded_at: string | null
  order: { order_number: string; contact_name: string; contact_phone: string } | null
  item: Pick<
    OrderItemRow,
    'product_name' | 'brand_name' | 'size_label' | 'sku' | 'unit_price' | 'image_path'
  > | null
}

const RETURN_SELECT =
  '*, order:orders(order_number, contact_name, contact_phone), item:order_items(product_name, brand_name, size_label, sku, unit_price, image_path)'

const mapReturn = (r: ReturnJoinRow): ReturnRequest => ({
  id: r.id,
  returnNumber: r.return_number,
  orderId: r.order_id,
  orderNumber: r.order?.order_number ?? null,
  orderItemId: r.order_item_id,
  userId: r.user_id,
  quantity: r.quantity,
  reason: r.reason,
  customerComment: r.customer_comment,
  status: r.status,
  restock: r.restock,
  refundAmount: pkrToMinorOrNull(r.refund_amount),
  staffNotes: r.staff_notes,
  requestedAt: r.requested_at,
  decidedAt: r.decided_at,
  receivedAt: r.received_at,
  refundedAt: r.refunded_at,
  item: r.item
    ? {
        productName: r.item.product_name,
        brandName: r.item.brand_name,
        sizeLabel: r.item.size_label,
        sku: r.item.sku,
        unitPrice: pkrToMinor(r.item.unit_price),
        imageUrl: r.item.image_path ? productImageUrl(r.item.image_path) : null,
      }
    : null,
  customer: r.order ? { name: r.order.contact_name, phone: r.order.contact_phone } : null,
})

export const returnService = {
  async list(status: ReturnStatus | 'open' | 'all' = 'open'): Promise<ReturnRequest[]> {
    let query = getSupabase()
      .from('returns')
      .select(RETURN_SELECT)
      .order('requested_at', { ascending: false })
      .limit(200)
    if (status === 'open') query = query.in('status', ['requested', 'approved', 'received'])
    else if (status !== 'all') query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw fromPostgrestError(error)
    return (data as unknown as ReturnJoinRow[]).map(mapReturn)
  },

  async forOrder(orderId: string): Promise<ReturnRequest[]> {
    const { data, error } = await getSupabase().from('returns').select(RETURN_SELECT).eq('order_id', orderId)
    if (error) throw fromPostgrestError(error)
    return (data as unknown as ReturnJoinRow[]).map(mapReturn)
  },

  /** Customer (own delivered order, within the window) or staff on their behalf. */
  async request(orderItemId: string, quantity: number, reason: ReturnReason, comment?: string) {
    check(
      await getSupabase().rpc('request_return', {
        p_order_item_id: orderItemId,
        p_quantity: quantity,
        p_reason: reason,
        p_comment: comment ?? null,
      }),
    )
  },

  /** Staff; 'refunded' is admin-only (enforced in public.update_return). */
  async update(
    id: string,
    status: ReturnStatus,
    opts: { restock?: boolean; refundAmount?: number | null; notes?: string } = {},
  ) {
    check(
      await getSupabase().rpc('update_return', {
        p_return_id: id,
        p_status: status,
        p_restock: opts.restock ?? null,
        p_refund_amount: opts.refundAmount != null ? minorToPkr(opts.refundAmount) : null,
        p_notes: opts.notes ?? null,
      }),
    )
  },
}
