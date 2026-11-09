/**
 * Owner finance types. Amounts are PKR rupees (numbers), exactly as computed by
 * public.finance_report(). All formulas live in SQL (private.fin_statement); the
 * UI only displays them.
 */
import type { Collection } from '@/constants/collections'
import type { ID, ISODateString } from './common'
import type { PaymentMethod } from './order'

export type Granularity = 'day' | 'week' | 'month' | 'year'

/** One P&L + cash-flow statement (for the whole period or one bucket). */
export interface Statement {
  gross_sales: number
  discounts: number
  sales_returns: number
  merchandise_net_sales: number
  delivery_income: number
  net_sales: number
  cogs: number
  gross_profit: number
  gross_margin: number | null
  opex_advertising: number
  opex_packaging: number
  opex_delivery: number
  opex_other: number
  operating_expenses: number
  net_profit: number
  net_margin: number | null
  delivery_net: number
  cash_in_sales: number
  cash_in_investment: number
  cash_out_refunds: number
  cash_out_expenses: number
  cash_out_stock: number
  cash_out_import: number
  cash_out_withdrawals: number
  cash_in: number
  cash_out: number
  net_cash: number
  operating_cash: number
  financing_cash: number
  orders_placed: number
  orders_delivered: number
  orders_cancelled: number
  orders_returned: number
  pairs_sold: number
  units_refunded: number
  cogs_missing_units: number
  inventory_purchased: number
  investment_initial: number
  investment_additional: number
  investment_withdrawal: number
}

export interface SeriesPoint extends Statement {
  bucket: string
}

export interface FinanceReport {
  from: string
  to: string
  granularity: Granularity
  totals: Statement
  series: SeriesPoint[]
  openingCash: number
  closingCash: number
  equity: { invested: number; withdrawn: number }
  inventory: { pairs: number; costValue: number; retailValue: number; pairsWithoutCost: number }
  pendingCod: {
    deliveredAmount: number
    deliveredOrders: number
    inTransitAmount: number
    inTransitOrders: number
    oldestDeliveredAt: ISODateString | null
    byCourier: Array<{ courier: string; orders: number; amount: number }>
  }
  salesByCollection: Array<{ collection: Collection; pairs: number; sales: number }>
  salesByBrand: Array<{ brand: string; pairs: number; sales: number }>
  salesByPaymentMethod: Array<{ method: PaymentMethod; orders: number; sales: number }>
  expensesBySubcategory: Array<{ category: ExpenseCategory; subcategory: string; amount: number }>
}

export type InvestmentType = 'initial' | 'additional' | 'withdrawal'
export interface Investment {
  id: ID
  type: InvestmentType
  amount: number
  invested_on: string
  investor: string
  method: string | null
  notes: string | null
}

export interface Supplier {
  id: ID
  name: string
  country: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
}

export type PurchaseStatus = 'ordered' | 'in_transit' | 'received'
export type PurchaseCostType = 'freight' | 'customs_duty' | 'clearing' | 'local_transport' | 'other'

export interface StockPurchase {
  id: ID
  reference: string
  supplier_id: ID | null
  supplier_name: string | null
  purchase_date: string
  pairs_count: number
  goods_cost: number
  status: PurchaseStatus
  received_on: string | null
  description: string | null
  notes: string | null
  import_costs: number
  landed_cost: number
  landed_unit_cost: number
  linked_products: number
}

export interface PurchaseCost {
  id: ID
  purchase_id: ID
  cost_type: PurchaseCostType
  amount: number
  cost_date: string
  vendor: string | null
  notes: string | null
}

export type ExpenseCategory = 'advertising' | 'packaging' | 'delivery' | 'other'
export type ExpensePaymentMethod = 'cash' | 'bank' | 'card' | 'wallet' | 'deducted_by_courier'

export interface Expense {
  id: ID
  category: ExpenseCategory
  subcategory: string | null
  description: string
  amount: number
  expense_date: string
  payment_method: ExpensePaymentMethod
  vendor: string | null
  reference: string | null
  courier_settlement_id: ID | null
}

export interface CourierSettlement {
  id: ID
  courier: string
  reference: string | null
  settled_on: string
  orders_count: number
  gross_cod: number
  courier_charges: number
  other_deductions: number
  net_received: number
  notes: string | null
  created_at: ISODateString
}

export interface PendingCodOrder {
  id: ID
  order_number: string
  contact_name: string
  shipping_city: string
  courier: string | null
  tracking_number: string | null
  status: 'shipped' | 'delivered'
  total: number
  delivered_at: ISODateString | null
  shipped_at: ISODateString | null
}

export interface RefundRecord {
  id: ID
  order_number: string
  contact_name: string
  amount: number
  paid_at: ISODateString
  notes: string | null
  provider_reference: string | null
  /** True when issued through a customer return (reduces sales); false = order refund (e.g. cancelled prepaid). */
  from_return: boolean
}

export interface DeliveredSaleRow {
  order_number: string
  delivered_at: ISODateString
  contact_name: string
  shipping_city: string
  payment_method: PaymentMethod
  payment_status: string
  subtotal: number
  discount_total: number
  shipping_fee: number
  total: number
  status: string
}
