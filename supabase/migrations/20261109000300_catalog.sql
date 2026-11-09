-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0003 · Catalog: categories, brands, products, images, variants,
--                     inventory ledger, product image storage
-- ════════════════════════════════════════════════════════════════════════════
-- Terminology: a product's COLLECTION (PREMIUM / A CATEGORY / B CATEGORY) is its
-- condition tier and is a fixed enum. CATEGORIES are footwear types (Sneakers,
-- Boots…) managed by staff.

-- ── Categories ──────────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();

-- ── Brands ──────────────────────────────────────────────────────────────────
create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index brands_name_ci_key on public.brands (lower(name));

create trigger brands_set_updated_at before update on public.brands
  for each row execute function private.set_updated_at();

-- ── Products ────────────────────────────────────────────────────────────────
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (char_length(name) between 2 and 140),
  brand_id         uuid not null references public.brands (id) on delete restrict,
  category_id      uuid references public.categories (id) on delete set null,
  model            text check (char_length(model) <= 120),
  description      text not null default '' check (char_length(description) <= 4000),
  collection       public.product_collection not null,
  gender           public.gender not null default 'unisex',
  condition        public.condition_grade not null,
  condition_notes  text check (char_length(condition_notes) <= 2000),
  -- [{ "area": "Left toe box", "severity": "minor" | "moderate" | "notable", "description": "…" }]
  defects          jsonb not null default '[]'::jsonb check (jsonb_typeof(defects) = 'array'),
  origin_country   text check (char_length(origin_country) <= 60),
  color            text check (char_length(color) <= 60),
  price            numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= price),
  status           public.product_status not null default 'draft',
  is_featured      boolean not null default false,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index products_collection_status_idx on public.products (collection, status);
create index products_status_created_idx    on public.products (status, created_at desc);
create index products_brand_idx             on public.products (brand_id);
create index products_category_idx          on public.products (category_id);
create index products_featured_idx          on public.products (created_at desc) where is_featured and status = 'active';
create index products_name_trgm_idx         on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_set_updated_at before update on public.products
  for each row execute function private.set_updated_at();

-- ── Product images ──────────────────────────────────────────────────────────
-- storage_path is relative to the `product-images` bucket: products/{product_id}/{uuid}.{ext}
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^products/[0-9a-f-]{36}/[^/]+$'),
  alt          text not null default '' check (char_length(alt) <= 200),
  view         public.image_view not null default 'side',
  position     integer not null default 0 check (position >= 0),
  created_at   timestamptz not null default now()
);

create index product_images_product_position_idx on public.product_images (product_id, position);
-- One photo per standard angle per product; details / on-foot / top may repeat.
create unique index product_images_one_per_view
  on public.product_images (product_id, view) where view in ('front', 'side', 'back', 'sole');

-- ── Product variants (size + stock) ─────────────────────────────────────────
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  sku            text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9-]{2,39}$'),
  size_system    public.size_system not null default 'EU',
  size_value     text not null check (size_value ~ '^[0-9]{1,2}(\.5)?$'),
  quantity       integer not null default 0 check (quantity >= 0),
  price_override numeric(12, 2) check (price_override >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (product_id, size_system, size_value)
);

create index product_variants_product_idx on public.product_variants (product_id);
create index product_variants_in_stock_idx on public.product_variants (size_value) where quantity > 0;

create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function private.set_updated_at();

-- ── Inventory ledger ────────────────────────────────────────────────────────
create table public.inventory_movements (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta      integer not null check (delta <> 0),
  reason     public.movement_reason not null,
  note       text check (char_length(note) <= 500),
  order_id   uuid, -- FK added in the orders migration
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_order_idx   on public.inventory_movements (order_id) where order_id is not null;

-- ── Triggers: ledger + automatic sold-out status ───────────────────────────
-- Any quantity change that did not come through private.apply_stock_change()
-- (e.g. a staff edit in the product editor) is still written to the ledger.
create or replace function private.log_variant_quantity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta integer;
begin
  if coalesce(current_setting('rajathrifs.movement_logged', true), '') = 'on' then
    return new;
  end if;
  v_delta := new.quantity - case when tg_op = 'INSERT' then 0 else old.quantity end;
  if v_delta <> 0 then
    insert into public.inventory_movements (variant_id, delta, reason, note, created_by)
    values (
      new.id,
      v_delta,
      case when tg_op = 'INSERT' then 'intake' else 'adjustment' end::public.movement_reason,
      case when tg_op = 'INSERT' then 'Initial stock' else 'Edited in product editor' end,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger product_variants_log_quantity
  after insert or update of quantity on public.product_variants
  for each row execute function private.log_variant_quantity_change();

-- Flip active ↔ sold_out as stock changes (never touches draft / archived).
create or replace function private.sync_product_stock_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set status = case
                    when exists (select 1 from public.product_variants v
                                  where v.product_id = v_product and v.quantity > 0)
                    then 'active'::public.product_status
                    else 'sold_out'::public.product_status
                  end
   where p.id = v_product
     and p.status in ('active', 'sold_out');
  return null;
end;
$$;

create trigger product_variants_sync_status
  after insert or delete or update of quantity on public.product_variants
  for each row execute function private.sync_product_stock_status();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.categories          enable row level security;
alter table public.brands              enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.inventory_movements enable row level security;

-- Categories & brands: public read, staff write, admin delete.
create policy "categories: public read" on public.categories for select to anon, authenticated using (true);
create policy "categories: staff insert" on public.categories for insert to authenticated with check ((select public.is_staff()));
create policy "categories: staff update" on public.categories for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "categories: admin delete" on public.categories for delete to authenticated using ((select public.is_admin()));

create policy "brands: public read" on public.brands for select to anon, authenticated using (true);
create policy "brands: staff insert" on public.brands for insert to authenticated with check ((select public.is_staff()));
create policy "brands: staff update" on public.brands for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "brands: admin delete" on public.brands for delete to authenticated using ((select public.is_admin()));

-- Products: customers see listed pairs; staff see everything (drafts, archive).
create policy "products: public read listed" on public.products for select to anon, authenticated
  using (status in ('active', 'sold_out') or (select public.is_staff()));
create policy "products: staff insert" on public.products for insert to authenticated with check ((select public.is_staff()));
create policy "products: staff update" on public.products for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "products: admin delete" on public.products for delete to authenticated using ((select public.is_admin()));

-- Images & variants inherit visibility from their product.
create policy "product_images: read with product" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "product_images: staff insert" on public.product_images for insert to authenticated with check ((select public.is_staff()));
create policy "product_images: staff update" on public.product_images for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "product_images: staff delete" on public.product_images for delete to authenticated using ((select public.is_staff()));

create policy "product_variants: read with product" on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "product_variants: staff insert" on public.product_variants for insert to authenticated with check ((select public.is_staff()));
create policy "product_variants: staff update" on public.product_variants for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "product_variants: staff delete" on public.product_variants for delete to authenticated using ((select public.is_staff()));

-- Ledger: staff read only. Rows are written exclusively by triggers / functions.
create policy "inventory_movements: staff read" on public.inventory_movements for select to authenticated
  using ((select public.is_staff()));
revoke insert, update, delete on public.inventory_movements from anon, authenticated;

-- ── Storage: product images bucket ──────────────────────────────────────────
-- Public read (product photos are public), 5 MB limit, images only. Only staff can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product-images: public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "product-images: staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_staff()));
create policy "product-images: staff update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_staff()));
create policy "product-images: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_staff()));
