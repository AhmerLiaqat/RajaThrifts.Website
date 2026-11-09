import type { Statement } from '@/types/finance'
import { pct } from './format'

export type Line = {
  label: string
  value: number
  kind?: 'line' | 'subtotal' | 'total' | 'memo'
  sign?: '+' | '−' | '='
  hint?: string
}

export function profitAndLoss(t: Statement): Line[] {
  return [
    { label: 'Gross sales (delivered orders)', value: t.gross_sales, sign: '+' },
    { label: 'Discounts', value: -t.discounts, sign: '−' },
    { label: 'Sales returns & refunds', value: -t.sales_returns, sign: '−' },
    { label: 'Merchandise net sales', value: t.merchandise_net_sales, kind: 'subtotal', sign: '=' },
    { label: 'Delivery charges collected', value: t.delivery_income, sign: '+', hint: 'from customers' },
    { label: 'Net sales', value: t.net_sales, kind: 'subtotal', sign: '=' },
    { label: 'Cost of goods sold', value: -t.cogs, sign: '−', hint: 'landed cost of pairs delivered' },
    { label: 'Gross profit', value: t.gross_profit, kind: 'subtotal', sign: '=', hint: pct(t.gross_margin) },
    { label: 'Advertising', value: -t.opex_advertising, sign: '−' },
    { label: 'Packaging', value: -t.opex_packaging, sign: '−' },
    { label: 'Delivery costs paid', value: -t.opex_delivery, sign: '−', hint: 'by the business' },
    { label: 'Other operating', value: -t.opex_other, sign: '−' },
    { label: 'Operating expenses', value: -t.operating_expenses, kind: 'subtotal', sign: '=' },
    { label: 'Net profit', value: t.net_profit, kind: 'total', sign: '=', hint: pct(t.net_margin) },
  ]
}

export function cashFlow(t: Statement, opening: number, closing: number): Line[] {
  return [
    { label: 'Opening cash', value: opening, kind: 'subtotal' },
    {
      label: 'Customer receipts',
      value: t.cash_in_sales,
      sign: '+',
      hint: 'COD counts when the courier settles',
    },
    { label: 'Refunds paid', value: -t.cash_out_refunds, sign: '−' },
    { label: 'Operating expenses paid', value: -t.cash_out_expenses, sign: '−' },
    { label: 'Stock purchases', value: -t.cash_out_stock, sign: '−' },
    { label: 'Import & shipping', value: -t.cash_out_import, sign: '−' },
    { label: 'Operating cash flow', value: t.operating_cash, kind: 'subtotal', sign: '=' },
    { label: 'Owner investments', value: t.cash_in_investment, sign: '+' },
    { label: 'Owner withdrawals', value: -t.cash_out_withdrawals, sign: '−' },
    { label: 'Financing cash flow', value: t.financing_cash, kind: 'subtotal', sign: '=' },
    { label: 'Net change in cash', value: t.net_cash, kind: 'subtotal', sign: '=' },
    { label: 'Closing cash', value: closing, kind: 'total' },
  ]
}
