// Advance bank-transfer checkout, payment screenshots, WhatsApp settings and reviews (migration 0009).
import { createTestDb } from './harness.mjs'

const { ok, as, q, err, mkUser, done } = await createTestDb({ quiet: true })

await as('postgres')
const admin = await mkUser('admin@rt.pk', { full_name: 'Admin' })
const shop = await mkUser('shop@rt.pk', { full_name: 'Shop' })
const alice = await mkUser('alice@rt.pk', { full_name: 'Alice' })
const bob = await mkUser('bob@rt.pk', { full_name: 'Bob' })
await q(`update profiles set role='admin' where id=$1`, [admin])
await q(`update profiles set role='shopkeeper' where id=$1`, [shop])

// One product with two pairs.
await as(shop)
const nike = (await q(`select id from brands where slug='nike'`))[0].id
const sneakers = (await q(`select id from categories where slug='sneakers'`))[0].id
const pid = (
  await q(`select save_product($1::jsonb, $2::jsonb) as id`, [
    JSON.stringify({ id: '', slug: 'af1', name: 'Air Force 1', brand_id: nike, category_id: sneakers, collection: 'A CATEGORY',
      condition: 'excellent', price: '9500', status: 'active', defects: [] }),
    JSON.stringify([{ sku: 'RT-A-1-42', size_value: '42', quantity: 3 }]),
  ])
)[0].id
const variant = (await q(`select id from product_variants where product_id=$1`, [pid]))[0].id

const items = JSON.stringify([{ variant_id: variant, quantity: 1 }])
const contact = JSON.stringify({ name: 'Alice K', phone: '0300 1234567' })
const addr = JSON.stringify({ line1: 'House 1, Street 2, Gulberg', city: 'Lahore', province: 'Punjab' })
const uuid = () => crypto.randomUUID()

console.log('\n# Store settings: bank + WhatsApp')
await as(admin)
ok('admin saves bank and WhatsApp details',
  (await q(`update store_settings set bank_name='Meezan Bank', bank_account_title='Raja Thrifs', bank_account_number='0123456789',
    bank_iban='PK00MEZN0000000123456789', whatsapp_number='923001234567', whatsapp_group_url='https://chat.whatsapp.com/AbCdEf123'
    where id returning id`)).length === 1)
ok('bad WhatsApp number rejected', !!(await err(`update store_settings set whatsapp_number='+92 300' where id`)))
ok('non-WhatsApp group link rejected', !!(await err(`update store_settings set whatsapp_group_url='https://evil.example/x' where id`)))
await as(shop)
ok('shopkeeper cannot change bank details', (await q(`update store_settings set bank_account_number='999' where id returning id`)).length === 0)
await as('anon')
ok('anon reads bank details for checkout', (await q(`select bank_account_number from store_settings`))[0]?.bank_account_number === '0123456789')

console.log('\n# Payment screenshots (storage)')
const aliceProof = `${alice}/${uuid()}.jpg`
await as(alice)
ok('customer uploads into own folder', (await err(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [aliceProof])) === null)
ok('customer cannot upload into another folder', !!(await err(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [`${bob}/${uuid()}.jpg`])))
await as('anon')
ok('anon cannot upload a screenshot', !!(await err(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [`x/${uuid()}.jpg`])))
ok('anon cannot see screenshots', (await q(`select name from storage.objects where bucket_id='payment-proofs'`)).length === 0)
await as(bob)
ok('other customer cannot see the screenshot', (await q(`select name from storage.objects where bucket_id='payment-proofs'`)).length === 0)
await as(shop)
ok('staff can see the screenshot', (await q(`select name from storage.objects where bucket_id='payment-proofs'`)).length === 1)

console.log('\n# place_order_with_proof')
await as(alice)
ok('order without screenshot rejected',
  (await err(`select place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,null,null)`, [items, contact, addr]))?.code === '22023')
ok('screenshot that was never uploaded rejected',
  (await err(`select place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,null,$4)`, [items, contact, addr, `${alice}/${uuid()}.jpg`]))?.code === '22023')
ok("someone else's screenshot path rejected",
  (await err(`select place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,null,$4)`, [items, contact, addr, `${bob}/${uuid()}.jpg`]))?.code === '22023')
ok('path traversal rejected',
  (await err(`select place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,null,$4)`, [items, contact, addr, `${alice}/../x.jpg`]))?.code === '22023')
const order = (await q(`select * from place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,'Near the mosque',$4)`, [items, contact, addr, aliceProof]))[0]
ok('order placed with screenshot', order?.order_number?.startsWith('RT-'), order?.order_number)
ok('payment method is bank transfer', order.payment_method === 'bank_transfer')
ok('payment stays pending until staff verify', order.payment_status === 'pending')
ok('screenshot path stored on the order', order.payment_proof_path === aliceProof && !!order.payment_proof_uploaded_at)
ok('note saved', order.customer_notes === 'Near the mosque')
ok('price computed by the server', Number(order.subtotal) === 9500)
ok('stock reserved', (await q(`select quantity from product_variants where id=$1`, [variant]))[0].quantity === 2)
await as('anon')
ok("anon cannot use a signed-in customer's screenshot",
  !!(await err(`select place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,null,$4)`, [items, contact, addr, aliceProof])))
ok('private validator not callable', !!(await err(`select private.assert_payment_proof('x')`)))

console.log('\n# set_payment_proof')
const newProof = `${alice}/${uuid()}.png`
await as(alice)
await q(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [newProof])
ok('customer replaces screenshot on pending order',
  (await q(`select payment_proof_path from set_payment_proof($1, $2)`, [order.id, newProof]))[0]?.payment_proof_path === newProof)
await as(bob)
const bobProof = `${bob}/${uuid()}.jpg`
await q(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [bobProof])
ok("customer cannot attach to someone else's order", (await err(`select set_payment_proof($1, $2)`, [order.id, bobProof]))?.code === 'P0002')
await as(admin)
await q(`select approve_order($1)`, [order.id])
await as(alice)
ok('screenshot locked once order is confirmed', (await err(`select set_payment_proof($1, $2)`, [order.id, newProof]))?.code === '22023')
ok('customer cannot edit proof column directly', !!(await err(`update orders set payment_proof_path='x' where id=$1`, [order.id])) ||
  (await q(`select payment_proof_path from orders where id=$1`, [order.id]))[0].payment_proof_path === newProof)

console.log('\n# Reviews')
await as(shop)
await q(`insert into reviews (customer_name, city, rating, body) values ('Hamza', 'Karachi', 5, 'Pair arrived exactly as shown. Will order again!')`)
await q(`insert into reviews (customer_name, rating, body, published) values ('Draft', 4, 'Not yet approved', false)`)
ok('staff add reviews', (await q(`select count(*)::int c from reviews`))[0].c === 2)
ok('rating outside 1-5 rejected', !!(await err(`insert into reviews (customer_name, rating, body) values ('X', 6, 'Too good')`)))
await as('anon')
ok('public sees only published reviews', (await q(`select customer_name from reviews`)).map((r) => r.customer_name).join() === 'Hamza')
ok('anon cannot add a review', !!(await err(`insert into reviews (customer_name, body) values ('Spam', 'Buy now')`)))
await as(alice)
ok('customer cannot add a review', !!(await err(`insert into reviews (customer_name, body) values ('Fake', 'Great shop')`)))
ok('customer cannot unpublish', (await q(`update reviews set published=false returning id`)).length === 0)
await as(shop)
ok('staff can delete a review', (await q(`delete from reviews where customer_name='Draft' returning id`)).length === 1)

console.log('\n# Guest checkout (no account)')
await as('postgres')
await q(`update product_variants set quantity = 10 where id = $1`, [variant])
const guestContact = JSON.stringify({ name: 'Guest Buyer', phone: '0321 5550000' })
const guestProof = () => `guest/${uuid()}.jpg`
const upload = (name) => q(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [name])
const placeGuest = (contactJson, addrJson, proof) =>
  q(`select * from place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,'Guest note',$4)`, [items, contactJson, addrJson, proof])
const placeGuestErr = (contactJson, addrJson, proof) =>
  err(`select place_order_with_proof($1::jsonb,$2::jsonb,$3::jsonb,null,$4)`, [items, contactJson, addrJson, proof])

await as('anon')
const g1 = guestProof()
ok('guest uploads screenshot to guest/', (await err(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [g1])) === null)
ok('guest cannot upload outside guest/', !!(await err(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [`${alice}/${uuid()}.jpg`])))
ok('guest cannot upload a non-image name', !!(await err(`insert into storage.objects (bucket_id, name) values ('payment-proofs', 'guest/evil.html')`)))
ok('guest cannot list screenshots', (await q(`select name from storage.objects where bucket_id='payment-proofs'`)).length === 0)
const go = (await placeGuest(guestContact, addr, g1))[0]
ok('guest places an order without signing in', go?.order_number?.startsWith('RT-') && go.user_id === null, go?.order_number)
ok('guest order is bank transfer with proof', go.payment_method === 'bank_transfer' && go.payment_proof_path === g1)
ok('phone_key stored', go.phone_key === '3215550000')
ok('same screenshot cannot back a second order', (await placeGuestErr(guestContact, addr, g1))?.code === '22023')
const g2 = guestProof()
await upload(g2)
ok('bad phone rejected', (await placeGuestErr(JSON.stringify({ name: 'X Y', phone: '123' }), addr, g2))?.code === '22023')
ok('missing address rejected', (await placeGuestErr(guestContact, JSON.stringify({ line1: '', city: '' }), g2))?.code === '22023')
for (let i = 0; i < 2; i++) {
  const p = guestProof()
  await upload(p)
  await placeGuest(guestContact, addr, p)
}
ok('4th pending order from the same phone blocked (any format)',
  (await placeGuestErr(JSON.stringify({ name: 'Guest Buyer', phone: '+92 321 5550000' }), addr, g2))?.code === '22023')
ok('guest cannot read orders table', (await q(`select id from orders`)).length === 0)
ok('anon still cannot call place_order', !!(await err(`select place_order($1::jsonb,$2::jsonb,$3::jsonb,'cod')`, [items, guestContact, addr])))

console.log('\n# Order tracking')
const tracked = (await q(`select track_order($1, '+92-321-5550000') as t`, [go.order_number.toLowerCase()]))[0].t
ok('guest tracks order with number + phone', tracked?.status === 'pending' && tracked.items?.length === 1 && Number(tracked.total) > 0)
ok('tracking hides address and phone', !JSON.stringify(tracked).includes('Street') && !JSON.stringify(tracked).includes('5550000'))
ok('wrong phone gives not found', (await err(`select track_order($1, '0300 0000000')`, [go.order_number]))?.code === 'P0002')
ok('short phone gives not found', (await err(`select track_order($1, '1')`, [go.order_number]))?.code === 'P0002')

console.log('\n# Staff view of guest customers')
await as(shop)
const guestRow = (await q(`select * from customer_summaries(null, 100)`)).find((c) => c.id === '3215550000')
ok('customers grouped by phone', Number(guestRow?.orders_count) === 3 && guestRow.full_name === 'Guest Buyer', JSON.stringify(guestRow ?? {}))
ok('customer search by phone digits', (await q(`select id from customer_summaries('0321-555', 100)`)).some((c) => c.id === '3215550000'))
ok('customer search by name', (await q(`select id from customer_summaries('guest buy', 100)`)).some((c) => c.id === '3215550000'))
ok('staff sees guest screenshot', (await q(`select name from storage.objects where name = $1`, [g1])).length === 1)
await as(admin)
await q(`select approve_order($1, 'MEZN-REF-9')`, [go.id])
await as(shop)
for (const s of ['shipped', 'delivered']) await q(`select update_order_status($1, $2::order_status)`, [go.id, s])
const item = (await q(`select id from order_items where order_id=$1`, [go.id]))[0].id
ok('staff logs a return on a guest order', (await err(`select request_return($1, 1, 'wrong_size', 'Too small')`, [item])) === null)
await as(alice)
ok('customer cannot call customer_summaries', !!(await err(`select * from customer_summaries()`)))

console.log('\n# Admin approval / rejection')
await as('postgres')
await q(`update orders set status = 'cancelled' where phone_key = '3215550000' and status = 'pending'`)
await as('anon')
const r1 = guestProof()
await upload(r1)
const toReject = (await placeGuest(guestContact, addr, r1))[0]
const stockBefore = (await q(`select quantity from product_variants where id=$1`, [variant]))[0]?.quantity
await as(shop)
ok('shopkeeper cannot reject', (await err(`select reject_order($1, 'No money')`, [toReject.id]))?.code === '42501')
await as(admin)
ok('reason required to reject', (await err(`select reject_order($1, '  ')`, [toReject.id]))?.code === '22023')
const rejected = (await q(`select * from reject_order($1, 'Transfer not received')`, [toReject.id]))[0]
ok('rejected order cancelled, payment failed', rejected.status === 'cancelled' && rejected.payment_status === 'failed')
ok('rejection reason kept in staff notes', (rejected.staff_notes ?? '').includes('Transfer not received'))
await as('postgres')
ok('rejected pairs back in stock', (await q(`select quantity from product_variants where id=$1`, [variant]))[0].quantity === (stockBefore ?? 0) + 1)
await as(admin)
ok('cannot approve a rejected order', (await err(`select approve_order($1)`, [toReject.id]))?.code === '22023')

process.exit(done() ? 1 : 0)
