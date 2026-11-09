-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0004 · Orders, order items, payments, wishlists
-- ════════════════════════════════════════════════════════════════════════════
-- Orders, order items and payments are NEVER written directly by clients.
-- They are created by public.place_order() and changed by the staff functions in 0005,
-- which validate prices and stock server-side.

create sequence public.order_number_seq as bigint start with 100001;

-- ── Orders ──────────────────────────────────────────────────────────────────
create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique default ('RT-' || nextval('public.order_number_seq')::text),
  user_id                uuid not null references public.profiles (id) on delete restrict,
  status                 public.order_status not null default 'pending',
  payment_status         public.payment_status not null default 'pending',
  payment_method         public.payment_method not null,
  currency               char(3) not null default 'PKR' check (currency = 'PKR'),
  subtotal               numeric(12, 2) not null default 0 check (subtotal >= 0),
  shipping_fee           numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  discount_total         numeric(12, 2) not null default 0 check (discount_total >= 0),
  total                  numeric(12, 2) generated always as (subtotal + shipping_fee - discount_total) stored,
  contact_name           text not null check (char_length(contact_name) between 2 and 120),
  contact_phone          text not null check (contact_phone ~ '^\+?[0-9][0-9 -]{6,19}$'),
  contact_email          text check (char_length(contact_email) <= 254),
  shipping_address_line1 text not null check (char_length(shipping_address_line1) between 3 and 200),
  shipping_address_line2 text check (char_length(shipping_address_line2) <= 200),
  shipping_city          text not null check (char_length(shipping_city) between 2 and 80),
  shipping_province      text check (char_length(shipping_province) <= 80),
  shipping_postal_code   text check (char_length(shipping_postal_code) <= 12),
  customer_notes         text check (char_length(customer_notes) <= 500),
  staff_notes            text check (char_length(staff_notes) <= 2000),
  tracking_number        text check (char_length(tracking_number) <= 80),
  placed_at              timestamptz not null default now(),
  confirmed_at           timestamptz,
  shipped_at             timestamptz,
  delivered_at           timestamptz,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint orders_total_non_negative check (subtotal + shipping_fee - discount_total >= 0)
);

create index orders_user_created_idx   on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

alter table public.inventory_movements
  add constraint inventory_movements_order_id_fkey
  foreign key (order_id) references public.orders (id) on delete set null;

-- ── Order items (snapshot of what was bought, at the price paid) ────────────
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  variant_id   uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  brand_name   text not null,
  collection   public.product_collection not null,
  size_label   text not null,
  sku          text not null,
  image_path   text,
  unit_price   numeric(12, 2) not null check (unit_price >= 0),
  quantity     integer not null check (quantity between 1 and 10),
  line_total   numeric(12, 2) generated always as (unit_price * quantity) stored,
  created_at   timestamptz not null default now()
);

create index order_items_order_idx   on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);
create index order_items_product_idx on public.order_items (product_id);

-- ── Payments ────────────────────────────────────────────────────────────────
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  method             public.payment_method not null,
  status             public.payment_status not null default 'pending',
  amount             numeric(12, 2) not null check (amount >= 0),
  currency           char(3) not null default 'PKR' check (currency = 'PKR'),
  provider_reference text check (char_length(provider_reference) <= 120),
  notes              text check (char_length(notes) <= 500),
  paid_at            timestamptz,
  recorded_by        uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);
create unique index payments_provider_reference_key on public.payments (provider_reference) where provider_reference is not null;

create trigger payments_set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();

-- ── Wishlists (one row per saved product) ──────────────────────────────────
create table public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlists_user_created_idx on public.wishlists (user_id, created_at desc);
create index wishlists_product_idx      on public.wishlists (product_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;
alter table public.wishlists   enable row level security;

-- Orders: customers read their own; staff read all and may edit tracking / notes only.
create policy "orders: customers read own" on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "orders: staff read all" on public.orders for select to authenticated
  using ((select public.is_staff()));
create policy "orders: staff update" on public.orders for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

revoke insert, update, delete on public.orders from anon, authenticated;
grant update (tracking_number, staff_notes) on public.orders to authenticated;

-- Order items & payments: visible with their order; written only by functions.
create policy "order_items: read with order" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
revoke insert, update, delete on public.order_items from anon, authenticated;

create policy "payments: read with order" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
revoke insert, update, delete on public.payments from anon, authenticated;

-- Wishlists: strictly private to their owner.
create policy "wishlists: owner read" on public.wishlists for select to authenticated
  using (user_id = (select auth.uid()));
create policy "wishlists: owner insert" on public.wishlists for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "wishlists: owner delete" on public.wishlists for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.wishlists from anon, authenticated;
