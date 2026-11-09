# RajaThrifs Architecture

Imported thrift footwear store. React 19 + TypeScript + Vite, Tailwind CSS v4, Framer Motion + GSAP, TanStack Query, Supabase.

## Collections

There are exactly three collections, stored verbatim in the database:

| Value        | URL slug     | Meaning                                   |
| ------------ | ------------ | ----------------------------------------- |
| `PREMIUM`    | `premium`    | Top-grade imported pairs, near-new        |
| `A CATEGORY` | `a-category` | Excellent condition, light wear           |
| `B CATEGORY` | `b-category` | Great value, visible wear                 |

The values are enforced in three places that must stay in sync:
`src/constants/collections.ts` (TS union), the `product_collection` Postgres enum, and `collectionTone` in `src/theme/tokens.ts`.

## Folder structure

```
src/
  app/                 App root: providers, router, route guards
    providers/         QueryClient, MotionConfig (add cart/toast here)
    router/            paths.ts (all URLs), router.tsx (route tree), guards/
  config/env.ts        Zod-validated environment. The only reader of import.meta.env
  constants/           Domain constants (collections)
  types/               Domain types (camelCase) + database.ts (raw snake_case rows)
  lib/                 Framework glue with no business logic
    supabase/client.ts Lazy singleton Supabase client
    query/             QueryClient + centralised query keys
    utils/             cn(), price/size formatting
  services/            Data access layer. The ONLY code that talks to Supabase
    core/              ServiceError, unwrap(), storage URL helpers
    products/ inventory/ auth/
  theme/               JS tokens (motion, z-index, collection tones) + Framer presets
  styles/              Tailwind entry + @theme design tokens
  components/
    ui/                Reusable primitives (Button, Badge, Card, Input, ...)
    feedback/          Loaders, error and placeholder states
  layouts/
    customer/          Storefront shell (header, footer)
    admin/             Back-office shell (sidebar)
  features/            One folder per business capability
    catalog/           Home, shop, collection, product detail
    cart/  auth/
    admin/{dashboard,products,inventory,orders}/
  pages/               Cross-feature pages (404)
supabase/migrations/   SQL schema, RLS policies, RPCs
```

Each feature contains `pages/`, `components/`, `hooks/` (and later `schemas/` for zod forms). A feature may import from `components`, `lib`, `services`, `types`, `theme` and `constants`, but never from another feature's internals.

## Data flow

```
Page/Component -> feature hook (useProducts) -> TanStack Query -> service (productService) -> Supabase
                                                                       |
                                                    row mappers: snake_case -> domain types
```

- Services expose interfaces (`ProductService`, ...), so they can be mocked in tests.
- All errors surface as `ServiceError` with a `code` (NOT_FOUND, FORBIDDEN, ...).
- Money is stored as integers in minor units (paisa). Format with `formatPrice()`.
- Authorization is enforced by Postgres RLS. `RequireAdmin` only improves UX.
  Admins are identified by `app_metadata.role = 'admin'`, which only the server can set.
- Stock never changes with a direct UPDATE from the client. It goes through the
  `adjust_stock` RPC, which writes an `inventory_movements` audit row atomically.

## Routing

| Path | Layout | Access |
| ---- | ------ | ------ |
| `/`, `/shop`, `/collections/:slug`, `/products/:slug`, `/cart`, `/wishlist` | Storefront | Everyone |
| `/login`, `/register`, `/reset-password` | Storefront | Everyone |
| `/checkout` | Storefront | Signed in (prompts otherwise) |
| `/account`, `/account/orders/:orderNumber` | Storefront | Signed in |
| `/dashboard` (overview) | Dashboard | Shopkeeper, admin |
| `/dashboard/products[/new\|/:id]`, `/brands`, `/sizes` | Dashboard | Shopkeeper, admin |
| `/dashboard/inventory`, `/orders`, `/returns`, `/customers` | Dashboard | Shopkeeper, admin |
| `/dashboard/users`, `/dashboard/settings` | Dashboard | Admin |
| `/dashboard/finance` (+ `/sales`, `/expenses`, `/purchases`, `/suppliers`, `/investments`, `/cod`, `/refunds`) | Dashboard | Admin (finance; see docs/SUPABASE.md) |
| `/admin/*` | Redirects to `/dashboard` | |

The dashboard is a separate layout (`layouts/admin/AdminLayout.tsx`): grouped sidebar with live badges on desktop,
a drawer on mobile, no storefront chrome. All pages are lazy-loaded; dashboard code and the charting library
(`vendor-charts` chunk) are never downloaded by storefront visitors.

### Dashboard modules (`src/features/admin`)

| Module | Page | Backed by |
| ------ | ---- | --------- |
| Overview | `dashboard/pages/DashboardPage` | `dashboard_summary(days)`: action queue, KPIs, daily sales chart, status/collection/brand breakdowns, inventory value |
| Products | `products/pages/*` | `save_product()` (now incl. purchase price), bulk collection/status updates, multi-photo upload with drag & drop |
| Brands | `catalog/pages/BrandsPage` | `brands` (+ product counts) |
| Size chart | `catalog/pages/SizesPage` | `shoe_sizes`; drives the editor's size picker and server-side size validation |
| Inventory & SKUs | `inventory/pages/InventoryPage` | `product_variants`, `adjust_stock()`, `inventory_movements`; low stock from `store_settings.low_stock_threshold` |
| Orders | `orders/pages/OrdersPage` | delivery queues (`to_ship`, `unpaid`), courier + tracking, payments, linked returns |
| Returns | `returns/pages/ReturnsPage` | `returns`, `update_return()`; customers request via `request_return()` on their order page |
| Customers | `customers/pages/CustomersPage` | `customer_summaries()` + order history |
| Users, Settings | `users`, `settings` | `set_user_role()`, `store_settings` (admin only) |

## Design system

Direction: cinematic luxury sneaker brand. Dark-first, editorial, sharp corners, film grain.

| Token | Hex | Role |
| ----- | --- | ---- |
| `night`  | #101010 | Page background (`surface`) |
| `carbon` | #1C1C1C | Raised panels, alternate sections (`surface-raised`) |
| `bone`   | #F5F1E8 | Primary text (`ink`), light sections |
| `sand`   | #C7B99A | Accent, PREMIUM tone |
| `stone`  | #A7A196 | Muted text (`ink-muted`), B CATEGORY tone |

- Type: **Space Grotesk** for display (`font-display`) and **Inter** for body (`font-sans`), loaded from Google Fonts in `index.html`.
- Tokens live in `src/styles/theme.css` (`@theme`). Helpers: `.eyebrow`, `.hollow` (outlined display text), `.grain`, `.no-scrollbar`.
  The outline class is deliberately not called `text-outline`: `tailwind-merge` would treat it as a text colour and drop it when it appears next to `text-sand`.
- Collection ladder: PREMIUM = sand, A CATEGORY = bone, B CATEGORY = stone (`collectionTone` in `src/theme/tokens.ts`).
- Motion split: **Framer Motion** handles component-level reveals (`Reveal`, `MaskedText`, navbar, mobile menu). **GSAP ScrollTrigger** handles scroll-scrubbed work
  (hero parallax, pinned horizontal New Arrivals, editorial parallax, story word reveal, footer wordmark).
  All GSAP goes through `useScrollAnimation()`, which scopes selectors, skips reduced-motion users and limits pinning and parallax to ≥1024px.

### Homepage sections (`src/features/home/sections`)

Hero → Marquee → Premium → A Category → B Category → New Arrivals → Best Sellers → Marquee → The Edit (editorial) → Brand Story → Reviews → Instagram → Footer.

### Demo content

`src/mocks/` holds sample listings, demo photography (Unsplash, hot-linked as their guidelines require) and placeholder reviews.
All of it is visibly tagged `Demo` / `Sample` in the UI and disclosed in the footer. Before launch:
switch the sections to `useProducts()` / `useFeaturedProducts()`, replace the reviews with verified ones, and set `INSTAGRAM_URL` once the account is confirmed.

## Shopping experience

| Route | Page | Notes |
| ----- | ---- | ----- |
| `/shop` | `ShopPage` → `CatalogView` | All collections |
| `/collections/:slug` | `CollectionPage` → `CatalogView meta=…` | `premium`, `a-category`, `b-category` |
| `/products/:slug` | `ProductDetailPage` | Gallery, purchase panel, defects, related |
| `/cart`, `/checkout` | `CartPage`, `CheckoutPage` | Checkout is a placeholder until Phase 5 |

**Data path.** UI → `useProducts` / `useProductFacets` / `useProduct` / `useRelatedProducts` → `catalogService`
(`src/services/index.ts`). It is either `demoProductService` (in-memory, used until Supabase is configured or when
`VITE_USE_DEMO_CATALOG=true`) or `productService` (Supabase). Both run the same pure logic in
`services/products/product.query.ts` (`filterProducts`, `sortProducts`, `computeFacets`, `relatedTo`), so the filters
behave identically on demo and real data.

**Filter state lives in the URL** (`useCatalogFilters`): `q`, `brand` (repeatable), `size` (repeatable), `min`/`max`
(whole PKR), `sort` (`newest | price_asc | price_desc | name_asc`), `stock` (`all | in_stock | sold_out`).
Facet counts ignore their own dimension, so ticking a brand doesn't zero the other brands' counts.

**Product detail data.** `Product.defects[]` (area, severity, description), `conditionNotes`, per-size `ProductVariant`
with its own SKU and stock, and `ProductImage.view` (`front | side | back | sole | top | detail | on_foot`).
`REQUIRED_IMAGE_VIEWS` = front, side, back, sole. The gallery shows a coverage row for these plus on-foot.
Schema: `supabase/migrations/0002_product_detail.sql`.

**Cart.** `features/cart/store/cart-store.ts` is a `useSyncExternalStore` store persisted to localStorage and synced across
tabs. Quantities are capped at listed stock (usually 1). Stock must be re-validated server-side at checkout (Phase 5).

## Backend (Supabase)

Setup, roles and the security model: **[docs/SUPABASE.md](./SUPABASE.md)**. Schema: `supabase/migrations`. DB tests: `npm run test:db`.

| Area | Frontend | Database |
| ---- | -------- | -------- |
| Auth | `services/auth/auth.service.ts`, `features/auth` (login, register, reset) | `auth.users` → trigger → `profiles` |
| Roles | `useAuth().hasRole`, `RequireAuth` / `RequireRole` guards (UX only) | `profiles.role`, `is_staff()`, `is_admin()`, RLS everywhere |
| Products | `adminProductService`, `/dashboard/products` editor | `save_product()` (atomic product + sizes), storage bucket `product-images` |
| Orders | `orderService`, checkout, `/account`, `/dashboard/orders` | `place_order()`, `cancel_order()`, `update_order_status()`, `record_payment()` |
| Wishlist | `features/wishlist` (localStorage for guests, synced on sign-in) | `wishlists` (owner-only RLS) |
| Users | `/dashboard/users` (admin only) | `set_user_role()` |

Money crosses the boundary in one place: `services/core/money.ts` (numeric PKR ↔ integer paisa).

## Environment

Copy `.env.example` to `.env.local`. Without Supabase keys the storefront runs on the demo catalog; accounts, checkout and the back office show a "needs Supabase" notice.
`VITE_DEV_ADMIN_BYPASS=true` opens `/admin` without logging in, in dev builds only.

## Development phases

1. **Foundation** (done): tooling, tokens, primitives, layouts, routing, types, service layer, env.
2. **Backend** (done): Supabase schema, RLS, auth, roles, product CRUD + photo uploads, checkout, orders, payments, wishlist. Remaining: create the project, apply migrations, bootstrap the first admin.
3. **Storefront catalog** (done on demo data): shop, collection pages, search, filters, sorting, product detail, gallery, related products, cart. Remaining: point `catalogService` at Supabase and upload real photos.
4. **Admin catalog and inventory**: product editor (react-hook-form + zod), image upload, stock adjustments, intake by shipment.
5. **Cart and orders**: persistent cart, checkout (COD / WhatsApp / payment gateway, to be decided), order management, stock reservation.
6. **Dashboard**: sales and inventory analytics with Recharts.
7. **Hardening**: SEO and meta tags, vendor chunk splitting, image optimisation, tests (Vitest + Playwright), CI, deployment.
