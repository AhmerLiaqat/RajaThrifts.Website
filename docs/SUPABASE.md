# Supabase setup

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com) (closest region to Pakistan: Mumbai / Singapore).
2. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key into `.env.local` (not `.env.example`, which Vite never reads; restart `npm run dev` afterwards)
   (see `.env.example`). Never use the `service_role` / `sb_secret_` key in this app. `src/config/env.ts`
   refuses to start if a privileged key is supplied.

## 2. Apply the schema

Either with the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push          # applies supabase/migrations in order
npx supabase db seed --linked # or paste supabase/seed.sql into the SQL editor
```

…or paste each file in `supabase/migrations/` (in filename order), then `supabase/seed.sql`, into **SQL Editor**.

| Migration | Contents |
| --------- | -------- |
| `…000100_foundation` | Extensions, `private` schema, enums, `updated_at` trigger |
| `…000200_profiles_roles` | `profiles`, roles, `is_staff()` / `is_admin()`, sign-up trigger, `set_user_role()` |
| `…000300_catalog` | `categories`, `brands`, `products`, `product_images`, `product_variants`, inventory ledger, storage bucket + policies |
| `…000400_orders_payments_wishlists` | `orders`, `order_items`, `payments`, `wishlists` + RLS |
| `…000500_functions` | `place_order`, `cancel_order`, `update_order_status`, `record_payment`, `adjust_stock`, `save_product` |
| `…000600_dashboard` | `store_settings`, `product_costs` (staff-only purchase prices), `shoe_sizes` + size validation, `orders.courier`, `returns` + `request_return` / `update_return`, `dashboard_summary`, `customer_summaries`; refunds become admin-only |
| `…000700_order_returned_status` | Adds the `returned` order status (courier return to sender) |
| `…000900_advance_payment_whatsapp_reviews` | Bank details + WhatsApp in `store_settings`, private `payment-proofs` bucket, `place_order_with_proof()` / `set_payment_proof()`, `reviews` |
| `…001000_guest_checkout` | Guest checkout (no customer accounts): nullable `orders.user_id`, `orders.phone_key`, guest screenshot uploads, `track_order()`, customers grouped by phone, 3 open orders per phone |
| `…001100_admin_approval` | Bank-transfer orders stay pending until an admin verifies the payment: `approve_order()`, `reject_order()`, trigger blocking non-admin verification |
| `…000800_finance` | Admin-only finance: investments, suppliers, stock purchases + import costs (landed cost), expenses, courier settlements, `order_item_costs`, delivery charge settings, `finance_report()` |

## 3. Authentication settings

**Authentication → URL Configuration**
- Site URL: your production URL (e.g. `https://rajathrifs.pk`)
- Redirect URLs: `http://localhost:5173/**` and `https://rajathrifs.pk/**`

**Authentication → Providers → Email**: keep **Confirm email** on (recommended). Registration then shows
"Check your email" and the link returns to `/login?confirmed=1`.

## 4. Create the first admin

Register normally in the app, then run once in the SQL editor (runs as `postgres`):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

From then on, admins promote staff in **/dashboard/users**.

## 5. Switch the storefront to live data

Set `VITE_USE_DEMO_CATALOG=false` (the default) and restart. Add products in **/dashboard/products**.

## Roles

Every row is enforced in the database (RLS or a role check inside a function). The dashboard only mirrors it.

| Capability | customer | shopkeeper | admin |
| ---------- | :------: | :--------: | :---: |
| Browse, wishlist, own profile, place / cancel own pending orders | ✓ | ✓ | ✓ |
| Request a return on own delivered order (within the return window) | ✓ | ✓ | ✓ |
| Products: create, edit, photos, assign collection, archive | | ✓ | ✓ |
| See and set purchase prices (`product_costs`) | | ✓ | ✓ |
| Brands & size chart: add, edit, hide | | ✓ | ✓ |
| Inventory: adjust stock, edit SKUs, view ledger | | ✓ | ✓ |
| Orders: status, delivery (courier, tracking), record payments | | ✓ | ✓ |
| Returns: approve, reject, receive (restock) | | ✓ | ✓ |
| Customers: view details and history | | ✓ | ✓ |
| Dashboard overview | | ✓ | ✓ |
| **Issue refunds** (return refunds, payment → refunded) | | | ✓ |
| **Store settings** (low stock threshold, return window) | | | ✓ |
| **Delete** products, brands, categories, sizes, costs | | | ✓ |
| **Assign roles** | | | ✓ |

## Security model

- **RLS is enabled on every table.** The browser key can do nothing beyond what policies allow for the signed-in user.
- **Roles live in `profiles.role`.** Users can update only their contact columns (column-level `GRANT`), never `role`.
  Roles change only through `set_user_role()`, which checks `is_admin()` and blocks self-demotion.
- **Orders are written only by `place_order()`** (`SECURITY DEFINER`). The client sends variant ids and quantities.
  Prices, totals and stock come from the database. Variant rows are locked `FOR UPDATE` in id order, so two
  buyers cannot both get the last pair. Customers are limited to 3 pending orders to stop stock hoarding.
- **Stock changes always write `inventory_movements`**: sales and cancellations via functions, editor edits via trigger.
  `active ↔ sold_out` status follows stock automatically.
- **Order items snapshot** name, brand, size, SKU and price at purchase, so history survives product edits and deletion.
- **Storage**: `product-images` is public-read, 5 MB, images only. Only staff can upload or delete.
- **Internal functions** live in the `private` schema, which the Data API does not expose.
- **Money**: `numeric(12,2)` PKR in the database; the frontend converts to integer paisa in the mappers.
- **Delivery fee**: `private.shipping_fee_for()` returns 0 until you set your pricing. Edit that one function.
- **Purchase prices** live in `product_costs`, not `products`, because `products` is publicly readable and a
  cost column there would leak through `select *`. Anonymous users have no privileges on the table at all.
- **Sizes**: new or re-sized EU variants must match an active row in `shoe_sizes` (trigger).
- **Returns** are created only by `request_return()` (owner within the window, or staff any time, never more than
  was bought) and moved only by `update_return()`. "Received" can restock through the ledger; "refunded" is admin-only
  and writes a refund payment. A fully refunded order flips to `refunded`.
- **Dashboard and customer aggregates** are `SECURITY DEFINER` functions that check `is_staff()` first.

## Testing the database

```bash
npm run test:db
```

Runs every migration on an in-process Postgres (PGlite) with Supabase-like `auth` / `storage` stubs
(`supabase/tests/harness.mjs`), then two suites:

- `security.test.mjs` (103 checks) tests security and business rules as anon, customer, shopkeeper and admin:
  privilege escalation, cross-user reads, overselling the last pair, price tampering, stock ledger, order
  lifecycle, returns, wishlist privacy.
- `checkout.test.mjs` (64 checks, including guest checkout, order tracking and admin approval) covers advance-payment checkout: screenshot required and owned by the buyer, private
  screenshots (owner + staff only), bank/WhatsApp settings admin-only, reviews publishing.
- `finance.test.mjs` (102 checks) runs a two-month shop scenario through the real functions: investments,
  an imported bale with import costs, five orders (delivered, prepaid, courier return, cancelled and refunded,
  returned by the customer), a COD settlement and expenses. It then compares every P&L and cash-flow figure,
  every daily, weekly, monthly and yearly bucket, and the admin-only wall against values **calculated by hand**
  in the file header.

Neither replaces testing against a real Supabase project (auth emails, storage uploads, PostgREST).

## Owner finance (admin only)

Migrations `…000700_order_returned_status` and `…000800_finance` add investments, suppliers, stock purchases,
import costs, expenses, courier settlements, cost snapshots and `finance_report()`. All finance tables are
readable and writable by **admins only**; shopkeepers get nothing (enforced by RLS and by `is_admin()` in every
function).

| Rule | How it is enforced |
| ---- | ------------------ |
| Revenue is recognised on **delivery** | `finance_events()` uses `orders.delivered_at`; cancelled and courier-returned (RTO) orders never count |
| Net Sales = gross − discounts − sales returns + delivery charges collected | `fin_statement()` |
| Gross Profit = Net Sales − COGS | `fin_statement()` |
| Net Profit = Gross Profit − Operating Expenses | `fin_statement()` |
| COGS = delivered units × landed unit cost, minus restocked returns | cost snapshotted per sold item in `order_item_costs` at checkout |
| Unsold inventory is never COGS | stock purchases + import costs are landed cost (inventory), not expenses |
| Delivery collected vs delivery paid are separate lines | `orders.shipping_fee` (income) vs `expenses.category = delivery` |
| Investments are not revenue | equity, in cash flow (financing) only |
| Cash flow is cash basis | receipts when paid (COD when the courier settles), refunds when paid out |

Set the customer delivery charge with
`update store_settings set delivery_charge = 250, free_delivery_threshold = 15000;` (threshold optional).
