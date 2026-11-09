/**
 * Owner finance data access. ADMIN ONLY: every table is admin-only under RLS and
 * every function checks is_admin(). All formulas are computed in SQL.
 */
import { getSupabase } from '@/lib/supabase/client'
import type {
  CourierSettlement,
  DeliveredSaleRow,
  Expense,
  FinanceReport,
  Granularity,
  Investment,
  PendingCodOrder,
  PurchaseCost,
  RefundRecord,
  SeriesPoint,
  Statement,
  StockPurchase,
  Supplier,
} from '@/types/finance'
import { check, fromPostgrestError, unwrap } from '../core/errors'

type Json = Record<string, unknown>

/**
 * numeric(12,2) columns may arrive as strings depending on the client; normalise
 * known money/count fields only (never phones, references or dates).
 */
const NUMERIC_KEYS = new Set([
  'amount',
  'goods_cost',
  'import_costs',
  'landed_cost',
  'landed_unit_cost',
  'gross_cod',
  'courier_charges',
  'other_deductions',
  'net_received',
  'total',
  'subtotal',
  'discount_total',
  'shipping_fee',
  'purchase_price',
  'pairs_count',
  'linked_products',
  'orders_count',
])
const numeric = <T extends Json>(row: T): T =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      NUMERIC_KEYS.has(k) && v !== null && v !== undefined ? Number(v) : v,
    ]),
  ) as T

const toStatement = (s: Json): Statement => {
  const out: Json = {}
  for (const [k, v] of Object.entries(s))
    out[k] = v === null ? null : typeof v === 'string' && k === 'bucket' ? v : Number(v)
  return out as unknown as Statement
}

interface ReportJson {
  from: string
  to: string
  granularity: Granularity
  totals: Json
  series: Json[]
  opening_cash: number
  closing_cash: number
  equity: { invested: number; withdrawn: number }
  inventory: { pairs: number; cost_value: number; retail_value: number; pairs_without_cost: number }
  pending_cod: {
    delivered_amount: number
    delivered_orders: number
    in_transit_amount: number
    in_transit_orders: number
    oldest_delivered_at: string | null
    by_courier: Array<{ courier: string; orders: number; amount: number }>
  }
  sales_by_collection: FinanceReport['salesByCollection']
  sales_by_brand: FinanceReport['salesByBrand']
  sales_by_payment_method: FinanceReport['salesByPaymentMethod']
  expenses_by_subcategory: FinanceReport['expensesBySubcategory']
}

const n = (v: unknown) => Number(v ?? 0)

async function list<T extends Json>(
  query: PromiseLike<{ data: unknown; error: import('@supabase/supabase-js').PostgrestError | null }>,
) {
  const { data, error } = await query
  if (error) throw fromPostgrestError(error)
  return (data as T[]).map(numeric)
}

/** Strip keys that are generated / not writable before insert/update. */
const writable = <T extends Json>(row: T, drop: string[]) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => !drop.includes(k)))

export const financeService = {
  async report(from: string, to: string, granularity: Granularity): Promise<FinanceReport> {
    const r = unwrap<ReportJson>(
      await getSupabase().rpc('finance_report', { p_from: from, p_to: to, p_granularity: granularity }),
    )
    return {
      from: r.from,
      to: r.to,
      granularity: r.granularity,
      totals: toStatement(r.totals),
      series: r.series.map((s) => ({ ...toStatement(s), bucket: String(s.bucket) }) as SeriesPoint),
      openingCash: n(r.opening_cash),
      closingCash: n(r.closing_cash),
      equity: { invested: n(r.equity.invested), withdrawn: n(r.equity.withdrawn) },
      inventory: {
        pairs: n(r.inventory.pairs),
        costValue: n(r.inventory.cost_value),
        retailValue: n(r.inventory.retail_value),
        pairsWithoutCost: n(r.inventory.pairs_without_cost),
      },
      pendingCod: {
        deliveredAmount: n(r.pending_cod.delivered_amount),
        deliveredOrders: n(r.pending_cod.delivered_orders),
        inTransitAmount: n(r.pending_cod.in_transit_amount),
        inTransitOrders: n(r.pending_cod.in_transit_orders),
        oldestDeliveredAt: r.pending_cod.oldest_delivered_at,
        byCourier: r.pending_cod.by_courier.map((c) => ({
          courier: c.courier,
          orders: n(c.orders),
          amount: n(c.amount),
        })),
      },
      salesByCollection: r.sales_by_collection.map((x) => ({ ...x, pairs: n(x.pairs), sales: n(x.sales) })),
      salesByBrand: r.sales_by_brand.map((x) => ({ ...x, pairs: n(x.pairs), sales: n(x.sales) })),
      salesByPaymentMethod: r.sales_by_payment_method.map((x) => ({
        ...x,
        orders: n(x.orders),
        sales: n(x.sales),
      })),
      expensesBySubcategory: r.expenses_by_subcategory.map((x) => ({ ...x, amount: n(x.amount) })),
    }
  },

  // ── Investments ─────────────────────────────────────────────────────────
  investments: () =>
    list<Investment & Json>(
      getSupabase().from('investments').select('*').order('invested_on', { ascending: false }),
    ),
  async saveInvestment(row: Omit<Investment, 'id'> & { id?: string }) {
    const data = writable(row as Json, ['id'])
    check(
      row.id
        ? await getSupabase().from('investments').update(data).eq('id', row.id)
        : await getSupabase().from('investments').insert(data),
    )
  },
  async deleteInvestment(id: string) {
    check(await getSupabase().from('investments').delete().eq('id', id))
  },

  // ── Suppliers ───────────────────────────────────────────────────────────
  suppliers: () => list<Supplier & Json>(getSupabase().from('suppliers').select('*').order('name')),
  async saveSupplier(row: Omit<Supplier, 'id'> & { id?: string }) {
    const data = writable(row as Json, ['id'])
    check(
      row.id
        ? await getSupabase().from('suppliers').update(data).eq('id', row.id)
        : await getSupabase().from('suppliers').insert(data),
    )
  },

  // ── Stock purchases & import costs ─────────────────────────────────────
  purchases: () =>
    list<StockPurchase & Json>(
      getSupabase().from('stock_purchase_summary').select('*').order('purchase_date', { ascending: false }),
    ),
  async savePurchase(row: Partial<StockPurchase> & { id?: string }) {
    const data = writable(row as Json, [
      'id',
      'supplier_name',
      'import_costs',
      'landed_cost',
      'landed_unit_cost',
      'linked_products',
      'created_at',
      'updated_at',
      'created_by',
    ])
    if (row.id) {
      check(await getSupabase().from('stock_purchases').update(data).eq('id', row.id))
      return row.id
    }
    return unwrap<{ id: string }>(
      await getSupabase().from('stock_purchases').insert(data).select('id').single(),
    ).id
  },
  async deletePurchase(id: string) {
    check(await getSupabase().from('stock_purchases').delete().eq('id', id))
  },
  purchaseCosts: (purchaseId: string) =>
    list<PurchaseCost & Json>(
      getSupabase().from('purchase_costs').select('*').eq('purchase_id', purchaseId).order('cost_date'),
    ),
  async addPurchaseCost(row: Omit<PurchaseCost, 'id'>) {
    check(await getSupabase().from('purchase_costs').insert(row))
  },
  async deletePurchaseCost(id: string) {
    check(await getSupabase().from('purchase_costs').delete().eq('id', id))
  },
  /** Link products to a purchase; with productIds null, re-apply landed cost to all linked products. */
  async assignProducts(purchaseId: string, productIds: string[] | null, applyCost = true): Promise<number> {
    return unwrap<number>(
      await getSupabase().rpc('assign_products_to_purchase', {
        p_purchase_id: purchaseId,
        p_product_ids: productIds,
        p_apply_cost: applyCost,
      }),
    )
  },
  async linkedProducts(purchaseId: string) {
    return list<
      {
        product_id: string
        purchase_price: number
        product: { name: string; brand: { name: string } | null }
      } & Json
    >(
      getSupabase()
        .from('product_costs')
        .select('product_id, purchase_price, product:products(name, brand:brands(name))')
        .eq('purchase_id', purchaseId),
    )
  },

  // ── Expenses ────────────────────────────────────────────────────────────
  expenses: (from: string, to: string) =>
    list<Expense & Json>(
      getSupabase()
        .from('expenses')
        .select('*')
        .gte('expense_date', from)
        .lte('expense_date', to)
        .order('expense_date', { ascending: false }),
    ),
  async saveExpense(row: Omit<Expense, 'id' | 'courier_settlement_id'> & { id?: string }) {
    const data = writable(row as Json, [
      'id',
      'courier_settlement_id',
      'created_at',
      'updated_at',
      'created_by',
    ])
    check(
      row.id
        ? await getSupabase().from('expenses').update(data).eq('id', row.id)
        : await getSupabase().from('expenses').insert(data),
    )
  },
  async deleteExpense(id: string) {
    check(await getSupabase().from('expenses').delete().eq('id', id))
  },

  // ── COD & courier settlements ───────────────────────────────────────────
  pendingCod: () =>
    list<PendingCodOrder & Json>(
      getSupabase()
        .from('orders')
        .select(
          'id, order_number, contact_name, shipping_city, courier, tracking_number, status, total, delivered_at, shipped_at',
        )
        .eq('payment_method', 'cod')
        .eq('payment_status', 'pending')
        .in('status', ['shipped', 'delivered'])
        .order('delivered_at', { ascending: true, nullsFirst: false }),
    ),
  settlements: () =>
    list<CourierSettlement & Json>(
      getSupabase()
        .from('courier_settlements')
        .select('*')
        .order('settled_on', { ascending: false })
        .limit(200),
    ),
  async recordSettlement(input: {
    courier: string
    settledOn: string
    orderIds: string[]
    courierCharges: number
    otherDeductions: number
    reference?: string
    notes?: string
  }) {
    return unwrap<CourierSettlement>(
      await getSupabase().rpc('record_courier_settlement', {
        p_courier: input.courier,
        p_settled_on: input.settledOn,
        p_order_ids: input.orderIds,
        p_courier_charges: input.courierCharges,
        p_other_deductions: input.otherDeductions,
        p_reference: input.reference || null,
        p_notes: input.notes || null,
      }),
    )
  },

  // ── Refunds & sales detail ──────────────────────────────────────────────
  async refunds(from: string, to: string): Promise<RefundRecord[]> {
    const rows = await list<
      {
        id: string
        amount: number
        paid_at: string
        notes: string | null
        provider_reference: string | null
        order: { order_number: string; contact_name: string } | null
      } & Json
    >(
      getSupabase()
        .from('payments')
        .select('id, amount, paid_at, notes, provider_reference, order:orders(order_number, contact_name)')
        .eq('status', 'refunded')
        .gte('paid_at', `${from}T00:00:00+05:00`)
        .lte('paid_at', `${to}T23:59:59.999+05:00`)
        .order('paid_at', { ascending: false }),
    )
    return rows.map((r) => ({
      id: r.id,
      order_number: r.order?.order_number ?? '—',
      contact_name: r.order?.contact_name ?? '—',
      amount: Number(r.amount),
      paid_at: r.paid_at,
      notes: r.notes,
      provider_reference: r.provider_reference,
      from_return: (r.notes ?? '').startsWith('Refund for RET-'),
    }))
  },

  deliveredSales: (from: string, to: string) =>
    list<DeliveredSaleRow & Json>(
      getSupabase()
        .from('orders')
        .select(
          'order_number, delivered_at, contact_name, shipping_city, payment_method, payment_status, subtotal, discount_total, shipping_fee, total, status',
        )
        .not('delivered_at', 'is', null)
        .gte('delivered_at', `${from}T00:00:00+05:00`)
        .lte('delivered_at', `${to}T23:59:59.999+05:00`)
        .order('delivered_at', { ascending: false })
        .limit(2000),
    ),
}
