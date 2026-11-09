// npm run test:db — finance scenario: a small shop's October–November, run through the real
// functions (checkout, delivery, courier return, cancellation, refund, COD settlement, return),
// then every P&L and cash-flow figure checked against HAND-CALCULATED values.
//
// ── The scenario (all amounts PKR, dates Asia/Karachi) ──────────────────────
// Investments   initial 300,000 (25 Sep, before the period) · additional 50,000 (15 Oct) · withdrawal 20,000 (1 Nov)
// Purchase      BALE-01 on 1 Oct: 10 pairs, goods 100,000 + freight 15,000 (3 Oct) + customs 10,000 (5 Oct)
//               → landed 125,000 → 12,500 per pair
// Products      A @ 25,000 (EU 41, 42, 43 × 1)   B @ 20,000 (EU 44 × 2)   both linked to BALE-01 (cost 12,500)
// Delivery      customer delivery charge 250 per order
// Orders        O1 COD  A-41  placed 18 Oct, delivered 20 Oct
//               O2 bank B-44  placed 20 Oct, paid 21 Oct, delivered 23 Oct
//               O3 COD  A-42  placed 22 Oct, returned by courier (RTO) 25 Oct   → never revenue, stock back
//               O4 bank A-43  placed 25 Oct, paid 26 Oct, cancelled 27 Oct, refunded 28 Oct → never revenue
//               O5 COD  B-44  placed 30 Oct, delivered 2 Nov; customer return received 5 Nov (restocked), refunded 20,000 on 6 Nov
// Settlement    TCS on 4 Nov for O1 + O5: gross 45,500, courier charges 600 (incl. O3 return fee) → net 44,900
// Expenses      advertising 8,000 (10 Oct) + 4,000 (3 Nov) · packaging 1,500 (12 Oct) · rent 10,000 (1 Nov)
//
// ── Hand-calculated results for 1 Oct – 30 Nov ──────────────────────────────
// Gross sales        O1 25,000 + O2 20,000 + O5 20,000                       = 65,000
// Sales returns      O5 refund                                              = 20,000
// Delivery collected 3 delivered × 250                                      =    750
// Net sales          65,000 − 0 − 20,000 + 750                              = 45,750
// COGS               3 delivered × 12,500 − 1 restocked × 12,500            = 25,000
// Gross profit       45,750 − 25,000                                        = 20,750
// Operating exp.     ads 12,000 + packaging 1,500 + delivery 600 + other 10,000 = 24,100
// Net profit         20,750 − 24,100                                        = −3,350
// Cash in            sales receipts 91,000 (O2 20,250 + O4 25,250 + settlement 45,500) + investment 50,000 = 141,000
// Cash out           refunds 45,250 (O4 25,250 + O5 20,000) + expenses 24,100 + stock 100,000 + import 25,000 + withdrawal 20,000 = 214,350
// Net cash           −73,350 · opening cash 300,000 · closing cash 226,650
// October            net sales 45,500 · COGS 25,000 · opex 9,500  → net profit 11,000
// November           net sales 250    · COGS 0      · opex 14,600 → net profit −14,350
import { createTestDb } from './harness.mjs'

const { ok, as, q, err, mkUser, done } = await createTestDb({ quiet: true })
const at = (d) => `${d}T12:00:00+05:00`
const n = (v) => Number(v)
const eq = (name, actual, expected) => ok(name, n(actual) === expected, `got ${actual}, expected ${expected}`)

console.log('# Finance scenario setup')
await as('postgres')
const admin = await mkUser('owner@rt.pk', { full_name: 'Owner' })
const shop = await mkUser('shop@rt.pk', { full_name: 'Shopkeeper' })
const c1 = await mkUser('c1@rt.pk', { full_name: 'Customer One' })
const c2 = await mkUser('c2@rt.pk', { full_name: 'Customer Two' })
await q(`update profiles set role = 'admin' where id = $1`, [admin])
await q(`update profiles set role = 'shopkeeper' where id = $1`, [shop])
await q(`update store_settings set delivery_charge = 250, return_window_days = 30`)
const nike = (await q(`select id from brands where slug = 'nike'`))[0].id

// ── Admin: supplier, purchase, import costs, investments ─────────────────────
await as(admin)
const sup = (await q(`insert into suppliers (name, country) values ('Manchester Bales', 'United Kingdom') returning id`))[0].id
const p1 = (await q(
  `insert into stock_purchases (reference, supplier_id, purchase_date, pairs_count, goods_cost)
   values ('BALE-01', $1, '2026-10-01', 10, 100000) returning id`, [sup]))[0].id
await q(`insert into purchase_costs (purchase_id, cost_type, amount, cost_date)
         values ($1, 'freight', 15000, '2026-10-03'), ($1, 'customs_duty', 10000, '2026-10-05')`, [p1])
const landed = (await q(`select landed_cost, landed_unit_cost from stock_purchase_summary where id = $1`, [p1]))[0]
eq('landed cost = goods + import costs', landed.landed_cost, 125000)
eq('landed unit cost = landed / pairs', landed.landed_unit_cost, 12500)
await q(`insert into investments (type, amount, invested_on, investor) values
         ('initial', 300000, '2026-09-25', 'Owner'), ('additional', 50000, '2026-10-15', 'Owner'),
         ('withdrawal', 20000, '2026-11-01', 'Owner')`)

// ── Shopkeeper: products; and the finance wall ────────────────────────────────
await as(shop)
const save = async (slug, name, price, sizes) =>
  (await q(`select save_product($1::jsonb, $2::jsonb) as id`, [
    JSON.stringify({ slug, name, brand_id: nike, collection: 'PREMIUM', condition: 'excellent', price: String(price), status: 'active' }),
    JSON.stringify(sizes.map(([s, qty]) => ({ sku: `RT-T-${slug.toUpperCase()}-${s}`, size_value: s, quantity: qty }))),
  ]))[0].id
const A = await save('pair-a', 'Pair A', 25000, [['41', 1], ['42', 1], ['43', 1]])
const B = await save('pair-b', 'Pair B', 20000, [['44', 2]])

console.log('\n# Admin-only access')
for (const t of ['investments', 'suppliers', 'stock_purchases', 'purchase_costs', 'expenses', 'courier_settlements', 'order_item_costs', 'stock_purchase_summary'])
  ok(`shopkeeper sees no ${t}`, (await q(`select * from ${t}`)).length === 0)
ok('shopkeeper cannot run finance report', (await err(`select finance_report('2026-10-01', '2026-10-31')`))?.code === '42501')
ok('shopkeeper cannot add an expense', !!(await err(`insert into expenses (category, description, amount, expense_date) values ('other', 'x', 1, '2026-10-01')`)))
ok('shopkeeper cannot record an investment', !!(await err(`insert into investments (type, amount, invested_on, investor) values ('initial', 1, '2026-10-01', 'x')`)))
ok('shopkeeper cannot link purchases', (await err(`select assign_products_to_purchase($1, $2::uuid[])`, [p1, [A]]))?.code === '42501')
ok('shopkeeper cannot settle COD', (await err(`select record_courier_settlement('TCS', '2026-11-01', '{}'::uuid[], 10)`))?.code === '42501')

await as(admin)
eq('admin links both products to BALE-01', (await q(`select assign_products_to_purchase($1, $2::uuid[]) as n`, [p1, [A, B]]))[0].n, 2)
ok('linked products take the landed unit cost', (await q(`select purchase_price from product_costs where product_id = any($1::uuid[])`, [[A, B]])).every((r) => n(r.purchase_price) === 12500))

// ── Orders through the real checkout ──────────────────────────────────────────
console.log('\n# Orders: checkout, delivery, courier return, cancellation')
const vid = async (pid, size) => (await q(`select id from product_variants where product_id = $1 and size_value = $2`, [pid, size]))[0].id
const vA41 = await vid(A, '41'), vA42 = await vid(A, '42'), vA43 = await vid(A, '43'), vB44 = await vid(B, '44')
const contact = JSON.stringify({ name: 'Test Buyer', phone: '+92 300 1111111' })
const address = JSON.stringify({ line1: 'House 1, Street 2', city: 'Lahore' })
const place = async (user, variant, method) => {
  await as(user)
  return (await q(`select * from place_order($1::jsonb, $2::jsonb, $3::jsonb, $4)`, [JSON.stringify([{ variant_id: variant, quantity: 1 }]), contact, address, method]))[0]
}
const O1 = await place(c1, vA41, 'cod')
eq('delivery charge added at checkout', O1.shipping_fee, 250)
eq('order total = items + delivery', O1.total, 25250)
const O2 = await place(c2, vB44, 'bank_transfer')
const O3 = await place(c1, vA42, 'cod')
const O4 = await place(c2, vA43, 'bank_transfer')
const O5 = await place(c1, vB44, 'cod')

ok('customer cannot read cost snapshots', (await q(`select * from order_item_costs`)).length === 0)
ok('customer order items expose no cost', !Object.keys((await q(`select * from order_items limit 1`))[0]).some((k) => k.includes('cost')))
await as(admin)
eq('unit cost snapshotted at checkout', (await q(`select c.unit_cost from order_item_costs c join order_items i on i.id = c.order_item_id where i.order_id = $1`, [O1.id]))[0].unit_cost, 12500)

await as(shop)
const move = async (o, ...statuses) => { for (const s of statuses) await q(`select update_order_status($1, $2)`, [o.id, s]) }
await move(O1, 'confirmed', 'shipped', 'delivered')
await q(`select record_payment($1, 'paid', 'BANK-O2')`, [O2.id])
await move(O2, 'confirmed', 'shipped', 'delivered')
await move(O3, 'confirmed', 'shipped', 'returned')
await q(`select record_payment($1, 'paid', 'BANK-O4')`, [O4.id])
await move(O4, 'cancelled')
await move(O5, 'confirmed', 'shipped', 'delivered')
eq('courier return puts the pair back in stock', (await q(`select quantity from product_variants where id = $1`, [vA42]))[0].quantity, 1)
ok('courier return voids the COD payment', (await q(`select payment_status from orders where id = $1`, [O3.id]))[0].payment_status === 'failed')
ok('returned order cannot be delivered', (await err(`select update_order_status($1, 'delivered')`, [O3.id]))?.code === '22023')
ok('shopkeeper cannot refund the cancelled prepaid order', (await err(`select record_payment($1, 'refunded')`, [O4.id]))?.code === '42501')

await as(admin)
const refundO4 = (await q(`select * from record_payment($1, 'refunded', 'BANK-RF-O4')`, [O4.id]))[0]
eq('admin refund returns exactly what was paid', refundO4.amount, 25250)
ok('cannot refund twice', (await err(`select record_payment($1, 'refunded')`, [O4.id]))?.code === '22023')
ok('cannot refund an order that was never paid', (await err(`select record_payment($1, 'refunded')`, [O3.id]))?.code === '22023')

// Backdate to the scenario calendar (as the database owner; the app never does this).
await as('postgres')
const dates = [
  [O1, { created_at: '2026-10-18', delivered_at: '2026-10-20' }],
  [O2, { created_at: '2026-10-20', delivered_at: '2026-10-23' }],
  [O3, { created_at: '2026-10-22', returned_at: '2026-10-25' }],
  [O4, { created_at: '2026-10-25', cancelled_at: '2026-10-27' }],
  [O5, { created_at: '2026-10-30', delivered_at: '2026-11-02' }],
]
for (const [o, cols] of dates)
  for (const [col, d] of Object.entries(cols)) await q(`update orders set ${col} = $2 where id = $1`, [o.id, at(d)])
await q(`update payments set paid_at = $2 where order_id = $1 and status = 'paid'`, [O2.id, at('2026-10-21')])
await q(`update payments set paid_at = $2 where order_id = $1 and status = 'paid'`, [O4.id, at('2026-10-26')])
await q(`update payments set paid_at = $2 where order_id = $1 and status = 'refunded'`, [O4.id, at('2026-10-28')])

await as(admin)
const report = async (from, to, g = 'month') => (await q(`select finance_report($1, $2, $3) as r`, [from, to, g]))[0].r
let r = await report('2026-10-01', '2026-11-30')
eq('pending COD before settlement (O1 + O5)', r.pending_cod.delivered_amount, 45500)
eq('pending COD orders', r.pending_cod.delivered_orders, 2)

// ── Courier settlement ────────────────────────────────────────────────────────
console.log('\n# Courier settlement')
ok('cannot settle a courier-returned order', (await err(`select record_courier_settlement('TCS', '2026-11-04', $1::uuid[], 0)`, [[O3.id]]))?.code === '22023')
ok('cannot settle a prepaid order', (await err(`select record_courier_settlement('TCS', '2026-11-04', $1::uuid[], 0)`, [[O2.id]]))?.code === '22023')
ok('settlement date cannot be in the future', (await err(`select record_courier_settlement('TCS', '2999-01-01', $1::uuid[], 0)`, [[O1.id]]))?.code === '22023')
const st = (await q(`select * from record_courier_settlement('TCS', '2026-11-04', $1::uuid[], 600, 0, 'TCS-SET-1')`, [[O1.id, O5.id]]))[0]
eq('settlement gross = COD totals', st.gross_cod, 45500)
eq('settlement net = gross − charges', st.net_received, 44900)
ok('settled orders are paid', (await q(`select payment_status from orders where id = any($1::uuid[])`, [[O1.id, O5.id]])).every((o) => o.payment_status === 'paid'))
ok('cannot settle the same orders twice', (await err(`select record_courier_settlement('TCS', '2026-11-04', $1::uuid[], 0)`, [[O1.id]]))?.code === '22023')
eq('courier charges booked as a delivery expense', (await q(`select sum(amount) s from expenses where courier_settlement_id = $1 and category = 'delivery'`, [st.id]))[0].s, 600)
ok('settlement expenses are locked', (await q(`update expenses set amount = 1 where courier_settlement_id is not null returning id`)).length === 0)

// ── Customer return on O5 ─────────────────────────────────────────────────────
console.log('\n# Customer return & refund')
const o5item = (await q(`select id from order_items where order_id = $1`, [O5.id]))[0].id
await as(c1)
const ret = (await q(`select * from request_return($1, 1, 'wrong_size', 'Too small')`, [o5item]))[0]
await as(shop)
await q(`select update_return($1, 'approved')`, [ret.id])
await q(`select update_return($1, 'received', true)`, [ret.id])
await as(admin)
await q(`select update_return($1, 'refunded')`, [ret.id])
eq('restocked return is back in stock', (await q(`select quantity from product_variants where id = $1`, [vB44]))[0].quantity, 1)
await as('postgres')
await q(`update returns set received_at = $2, refunded_at = $3 where id = $1`, [ret.id, at('2026-11-05'), at('2026-11-06')])
await q(`update payments set paid_at = $2 where order_id = $1 and status = 'refunded'`, [O5.id, at('2026-11-06')])

// ── Expenses ──────────────────────────────────────────────────────────────────
await as(admin)
await q(`insert into expenses (category, subcategory, description, amount, expense_date) values
  ('advertising', 'Meta ads', 'October campaign', 8000, '2026-10-10'),
  ('advertising', 'Meta ads', 'November boost', 4000, '2026-11-03'),
  ('packaging', 'Boxes', 'Shoe boxes', 1500, '2026-10-12'),
  ('other', 'Rent', 'Shop rent', 10000, '2026-11-01')`)

// ── The full period ───────────────────────────────────────────────────────────
console.log('\n# Profit & loss, 1 Oct – 30 Nov (hand-calculated)')
r = await report('2026-10-01', '2026-11-30')
const t = r.totals
eq('gross sales (delivered only)', t.gross_sales, 65000)
eq('sales returns', t.sales_returns, 20000)
eq('delivery charges collected', t.delivery_income, 750)
eq('net sales', t.net_sales, 45750)
eq('cost of goods sold', t.cogs, 25000)
eq('gross profit = net sales − COGS', t.gross_profit, 20750)
eq('advertising', t.opex_advertising, 12000)
eq('packaging', t.opex_packaging, 1500)
eq('delivery costs paid (separate from collected)', t.opex_delivery, 600)
eq('other operating', t.opex_other, 10000)
eq('operating expenses', t.operating_expenses, 24100)
eq('net profit = gross profit − operating expenses', t.net_profit, -3350)
eq('delivery net (collected − paid)', t.delivery_net, 150)
ok('investments are not revenue', n(t.net_sales) === 45750 && n(t.gross_sales) === 65000, `invested ${r.equity.invested}`)
ok('unsold inventory is not COGS', n(t.inventory_purchased) === 125000 && n(t.cogs) === 25000)
eq('no sold units missing a cost', t.cogs_missing_units, 0)

console.log('\n# Orders & units')
eq('orders placed', t.orders_placed, 5)
eq('orders delivered', t.orders_delivered, 3)
eq('orders cancelled', t.orders_cancelled, 1)
eq('orders returned by courier', t.orders_returned, 1)
eq('pairs sold', t.pairs_sold, 3)
eq('units refunded', t.units_refunded, 1)

console.log('\n# Cash flow')
eq('customer receipts', t.cash_in_sales, 91000)
eq('investment received in period', t.cash_in_investment, 50000)
eq('refunds paid', t.cash_out_refunds, 45250)
eq('expenses paid', t.cash_out_expenses, 24100)
eq('stock purchased', t.cash_out_stock, 100000)
eq('import & shipping paid', t.cash_out_import, 25000)
eq('owner withdrawals', t.cash_out_withdrawals, 20000)
eq('cash in', t.cash_in, 141000)
eq('cash out', t.cash_out, 214350)
eq('net cash flow', t.net_cash, -73350)
eq('operating cash flow', t.operating_cash, -103350)
eq('financing cash flow', t.financing_cash, 30000)
eq('opening cash (initial investment before period)', r.opening_cash, 300000)
eq('closing cash = opening + net', r.closing_cash, 226650)
eq('pending COD after settlement', r.pending_cod.delivered_amount, 0)
eq('equity invested to date', r.equity.invested, 350000)
eq('equity withdrawn to date', r.equity.withdrawn, 20000)
eq('inventory pairs on hand (A-42, A-43, B-44)', r.inventory.pairs, 3)
eq('inventory at cost', r.inventory.cost_value, 37500)

console.log('\n# Monthly / weekly / daily / yearly buckets')
const oct = r.series.find((s) => s.bucket === '2026-10-01')
const nov = r.series.find((s) => s.bucket === '2026-11-01')
eq('October net sales', oct.net_sales, 45500)
eq('October COGS', oct.cogs, 25000)
eq('October operating expenses', oct.operating_expenses, 9500)
eq('October net profit', oct.net_profit, 11000)
eq('November net sales', nov.net_sales, 250)
eq('November COGS (sale reversed by restocked return)', nov.cogs, 0)
eq('November operating expenses', nov.operating_expenses, 14600)
eq('November net profit', nov.net_profit, -14350)
for (const g of ['day', 'week', 'month', 'year']) {
  const rg = await report('2026-10-01', '2026-11-30', g)
  const sum = (k) => rg.series.reduce((acc, s) => acc + n(s[k]), 0)
  ok(`${g}: buckets add up to totals`, sum('net_profit') === -3350 && sum('net_sales') === 45750 && sum('net_cash') === -73350 && sum('cogs') === 25000,
    `${rg.series.length} buckets`)
}
eq('daily view has one bucket per day', (await report('2026-10-01', '2026-11-30', 'day')).series.length, 61)

console.log('\n# Period isolation & cost snapshot')
const octOnly = await report('2026-10-01', '2026-10-31')
eq('October-only net profit', octOnly.totals.net_profit, 11000)
eq('October-only net cash (95,500 in − 159,750 out)', octOnly.totals.net_cash, -64250)
eq('October closing cash', octOnly.closing_cash, 235750)
await q(`update product_costs set purchase_price = 50000 where product_id = $1`, [A])
eq('changing a cost later does not rewrite past COGS', (await report('2026-10-01', '2026-10-31')).totals.cogs, 25000)

console.log('\n# Input validation')
ok('rejects reversed date range', (await err(`select finance_report('2026-11-01', '2026-10-01')`))?.code === '22023')
ok('rejects unknown granularity', (await err(`select finance_report('2026-10-01', '2026-10-31', 'hour')`))?.code === '22023')
ok('rejects daily view over 400 days', (await err(`select finance_report('2024-01-01', '2026-01-01', 'day')`))?.code === '22023')

process.exit(done() ? 1 : 0)
