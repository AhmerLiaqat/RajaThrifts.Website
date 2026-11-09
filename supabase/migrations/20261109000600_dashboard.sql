-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0006 · Shopkeeper dashboard: store settings, purchase prices,
--                     size chart, delivery, returns, dashboard & customer aggregates
-- ════════════════════════════════════════════════════════════════════════════
-- Permission model added here (enforced in the database, not just the UI):
--   shopkeeper → products, costs, sizes, brands, stock, orders, returns up to "received"
--   admin      → everything above + refunds, store settings, deletes, roles

-- ── Store settings (single row) ─────────────────────────────────────────────
create table public.store_settings (
  id                  boolean primary key default true check (id),
  -- A listing with this many pairs or fewer (and more than 0) counts as low stock.
  low_stock_threshold integer not null default 1 check (low_stock_threshold between 0 and 50),
  -- Days after delivery a customer may request a return. 0 disables customer requests.
  return_window_days  integer not null default 7 check (return_window_days between 0 and 60),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles (id) on delete set null
);

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function private.set_updated_at();

alter table public.store_settings enable row level security;
create policy "store_settings: public read" on public.store_settings for select to anon, authenticated using (true);
create policy "store_settings: admin update" on public.store_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke insert, delete on public.store_settings from anon, authenticated;

-- ── Purchase prices (staff only, never exposed to customers) ───────────────
-- Kept out of public.products on purpose: products is publicly readable, and a
-- cost column there would leak through `select *`.
create table public.product_costs (
  product_id     uuid primary key references public.products (id) on delete cascade,
  purchase_price numeric(12, 2) not null check (purchase_price >= 0),
  supplier_ref   text check (char_length(supplier_ref) <= 120),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null
);

create trigger product_costs_set_updated_at before update on public.product_costs
  for each row execute function private.set_updated_at();

alter table public.product_costs enable row level security;
create policy "product_costs: staff read" on public.product_costs for select to authenticated
  using ((select public.is_staff()));
create policy "product_costs: staff insert" on public.product_costs for insert to authenticated
  with check ((select public.is_staff()));
create policy "product_costs: staff update" on public.product_costs for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "product_costs: admin delete" on public.product_costs for delete to authenticated
  using ((select public.is_admin()));
revoke all on public.product_costs from anon;

-- ── Size chart ──────────────────────────────────────────────────────────────
create table public.shoe_sizes (
  id             uuid primary key default gen_random_uuid(),
  eu             numeric(3, 1) not null unique check (eu between 15 and 55 and eu * 2 = round(eu * 2)),
  uk             numeric(3, 1),
  us_men         numeric(3, 1),
  us_women       numeric(3, 1),
  foot_length_cm numeric(3, 1) check (foot_length_cm between 10 and 40),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger shoe_sizes_set_updated_at before update on public.shoe_sizes
  for each row execute function private.set_updated_at();

alter table public.shoe_sizes enable row level security;
create policy "shoe_sizes: public read" on public.shoe_sizes for select to anon, authenticated using (true);
create policy "shoe_sizes: staff insert" on public.shoe_sizes for insert to authenticated with check ((select public.is_staff()));
create policy "shoe_sizes: staff update" on public.shoe_sizes for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "shoe_sizes: admin delete" on public.shoe_sizes for delete to authenticated using ((select public.is_admin()));

-- Approximate unisex conversions (brands vary); staff can edit in the dashboard.
insert into public.shoe_sizes (eu, uk, us_men, us_women, foot_length_cm) values
  (36, 3.5, 4, 5.5, 22.5), (37, 4.5, 5, 6.5, 23.5), (38, 5, 5.5, 7, 24),
  (39, 6, 6.5, 8, 24.5),   (40, 6.5, 7, 8.5, 25),   (41, 7.5, 8, 9.5, 26),
  (42, 8, 8.5, 10, 26.5),  (43, 9, 9.5, 11, 27.5),  (44, 9.5, 10, 11.5, 28),
  (45, 10.5, 11, 12.5, 29),(46, 11, 11.5, 13, 29.5),(47, 12, 12.5, 14, 30.5)
on conflict (eu) do nothing;

-- New or re-sized EU variants must use an active size from the chart.
create or replace function private.validate_variant_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.size_system = 'EU'
     and (tg_op = 'INSERT' or new.size_value is distinct from old.size_value)
     and not exists (select 1 from public.shoe_sizes s where s.is_active and s.eu = new.size_value::numeric)
  then
    raise exception 'EU % is not in the active size chart', new.size_value using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger product_variants_validate_size
  before insert or update of size_value, size_system on public.product_variants
  for each row execute function private.validate_variant_size();

-- ── Delivery ────────────────────────────────────────────────────────────────
alter table public.orders add column courier text check (char_length(courier) <= 60);
grant update (courier) on public.orders to authenticated; -- staff only via the existing RLS policy

create index orders_delivery_idx on public.orders (status) where status in ('confirmed', 'processing', 'shipped');

-- ── Returns ─────────────────────────────────────────────────────────────────
create type public.return_status as enum ('requested', 'approved', 'rejected', 'received', 'refunded');
create type public.return_reason as enum (
  'wrong_size', 'not_as_described', 'defect_not_disclosed', 'damaged_in_transit', 'changed_mind', 'other'
);

create sequence public.return_number_seq as bigint start with 5001;

create table public.returns (
  id               uuid primary key default gen_random_uuid(),
  return_number    text not null unique default ('RET-' || nextval('public.return_number_seq')::text),
  order_id         uuid not null references public.orders (id) on delete cascade,
  order_item_id    uuid not null references public.order_items (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete restrict,
  quantity         integer not null check (quantity >= 1),
  reason           public.return_reason not null,
  customer_comment text check (char_length(customer_comment) <= 1000),
  status           public.return_status not null default 'requested',
  restock          boolean not null default true,
  refund_amount    numeric(12, 2) check (refund_amount >= 0),
  staff_notes      text check (char_length(staff_notes) <= 2000),
  handled_by       uuid references public.profiles (id) on delete set null,
  requested_at     timestamptz not null default now(),
  decided_at       timestamptz,
  received_at      timestamptz,
  refunded_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index returns_status_idx on public.returns (status, requested_at desc);
create index returns_order_idx  on public.returns (order_id);
create index returns_user_idx   on public.returns (user_id, requested_at desc);
create index returns_item_idx   on public.returns (order_item_id);

create trigger returns_set_updated_at before update on public.returns
  for each row execute function private.set_updated_at();

alter table public.returns enable row level security;
create policy "returns: customers read own" on public.returns for select to authenticated
  using (user_id = (select auth.uid()));
create policy "returns: staff read all" on public.returns for select to authenticated
  using ((select public.is_staff()));
revoke insert, update, delete on public.returns from anon, authenticated;

-- Customer (own delivered order, inside the return window) or staff (on a customer's behalf).
create or replace function public.request_return(
  p_order_item_id uuid,
  p_quantity      integer,
  p_reason        public.return_reason,
  p_comment       text default null
)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item     public.order_items;
  v_order    public.orders;
  v_staff    boolean := public.is_staff();
  v_window   integer;
  v_returned integer;
  v_return   public.returns;
begin
  select * into v_item from public.order_items where id = p_order_item_id;
  if found then
    select * into v_order from public.orders where id = v_item.order_id for update;
  end if;
  if not found or (not v_staff and v_order.user_id is distinct from (select auth.uid())) then
    raise exception 'Order item not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'delivered' then
    raise exception 'Returns can be requested once the order is delivered' using errcode = '22023';
  end if;

  if not v_staff then
    select return_window_days into v_window from public.store_settings where id;
    if v_window = 0 or v_order.delivered_at < now() - make_interval(days => v_window) then
      raise exception 'The return window for this order has closed. Please contact us.' using errcode = '22023';
    end if;
  end if;

  select coalesce(sum(quantity), 0) into v_returned
    from public.returns where order_item_id = v_item.id and status <> 'rejected';
  if p_quantity is null or p_quantity < 1 or p_quantity > v_item.quantity - v_returned then
    raise exception 'You can return up to % of this item', greatest(v_item.quantity - v_returned, 0) using errcode = '22023';
  end if;

  insert into public.returns (order_id, order_item_id, user_id, quantity, reason, customer_comment, handled_by)
  values (
    v_order.id, v_item.id, v_order.user_id, p_quantity, p_reason,
    nullif(left(trim(p_comment), 1000), ''),
    case when v_staff then (select auth.uid()) end
  )
  returning * into v_return;
  return v_return;
end;
$$;

-- Staff move returns along: requested → approved | rejected → received → refunded (admin).
create or replace function public.update_return(
  p_return_id     uuid,
  p_status        public.return_status,
  p_restock       boolean default null,
  p_refund_amount numeric default null,
  p_notes         text default null
)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_return  public.returns;
  v_item    public.order_items;
  v_order   public.orders;
  v_allowed public.return_status[];
  v_amount  numeric(12, 2);
  v_open    integer;
begin
  if not public.is_staff() then
    raise exception 'Only staff can manage returns' using errcode = '42501';
  end if;
  if p_status = 'refunded' and not public.is_admin() then
    raise exception 'Only admins can issue refunds' using errcode = '42501';
  end if;

  select * into v_return from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'Return not found' using errcode = 'P0002';
  end if;
  select * into v_item from public.order_items where id = v_return.order_item_id;
  select * into v_order from public.orders where id = v_return.order_id for update;

  v_allowed := case v_return.status
    when 'requested' then array['approved', 'rejected']::public.return_status[]
    when 'approved'  then array['received', 'rejected']::public.return_status[]
    when 'received'  then array['refunded']::public.return_status[]
    else array[]::public.return_status[]
  end;
  if not (p_status = any (v_allowed)) then
    raise exception 'Cannot move a return from % to %', v_return.status, p_status using errcode = '22023';
  end if;

  if p_status = 'received' then
    if coalesce(p_restock, v_return.restock) and v_item.variant_id is not null then
      perform private.apply_stock_change(
        v_item.variant_id, v_return.quantity, 'return', 'Return ' || v_return.return_number, v_order.id
      );
    end if;
  end if;

  if p_status = 'refunded' then
    v_amount := coalesce(p_refund_amount, v_item.unit_price * v_return.quantity);
    if v_amount < 0 or v_amount > v_item.unit_price * v_return.quantity then
      raise exception 'Refund must be between 0 and %', v_item.unit_price * v_return.quantity using errcode = '22023';
    end if;
    insert into public.payments (order_id, method, status, amount, notes, paid_at, recorded_by)
    values (v_order.id, v_order.payment_method, 'refunded', v_amount,
            'Refund for ' || v_return.return_number, now(), (select auth.uid()));
  end if;

  update public.returns set
    status        = p_status,
    restock       = coalesce(p_restock, restock),
    refund_amount = case when p_status = 'refunded' then v_amount else refund_amount end,
    staff_notes   = coalesce(nullif(trim(p_notes), ''), staff_notes),
    handled_by    = (select auth.uid()),
    decided_at    = case when p_status in ('approved', 'rejected') then now() else decided_at end,
    received_at   = case when p_status = 'received' then now() else received_at end,
    refunded_at   = case when p_status = 'refunded' then now() else refunded_at end
  where id = p_return_id
  returning * into v_return;

  -- When every unit on the order has been refunded, the order itself is refunded.
  if p_status = 'refunded' then
    select coalesce(sum(oi.quantity), 0) - coalesce((
             select sum(r.quantity) from public.returns r
              where r.order_id = v_order.id and r.status = 'refunded'), 0)
      into v_open
      from public.order_items oi where oi.order_id = v_order.id;
    if v_open <= 0 then
      update public.orders set status = 'refunded', payment_status = 'refunded' where id = v_order.id;
    end if;
  end if;

  return v_return;
end;
$$;

-- ── Payments: refunds are admin-only ────────────────────────────────────────
create or replace function public.record_payment(
  p_order_id  uuid,
  p_status    public.payment_status,
  p_reference text default null,
  p_notes     text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  if not public.is_staff() then
    raise exception 'Only staff can record payments' using errcode = '42501';
  end if;
  if p_status = 'refunded' and not public.is_admin() then
    raise exception 'Only admins can mark payments as refunded' using errcode = '42501';
  end if;

  select * into v_payment from public.payments
   where order_id = p_order_id and status <> 'refunded'
   order by created_at desc limit 1 for update;
  if not found then
    raise exception 'Payment not found for this order' using errcode = 'P0002';
  end if;

  update public.payments
     set status             = p_status,
         provider_reference = coalesce(nullif(trim(p_reference), ''), provider_reference),
         notes              = coalesce(nullif(trim(p_notes), ''), notes),
         paid_at            = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
         recorded_by        = (select auth.uid())
   where id = v_payment.id
  returning * into v_payment;

  update public.orders set payment_status = p_status where id = p_order_id;
  return v_payment;
end;
$$;

-- ── Product save: now also stores the purchase price ────────────────────────
create or replace function public.save_product(p_product jsonb, p_variants jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id      uuid := nullif(p_product ->> 'id', '')::uuid;
  v_variant jsonb;
  v_cost    numeric := nullif(p_product ->> 'purchase_price', '')::numeric;
begin
  if not public.is_staff() then
    raise exception 'Only staff can save products' using errcode = '42501';
  end if;
  if jsonb_typeof(p_variants) is distinct from 'array' then
    raise exception 'Variants must be a list' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.products (
      slug, name, brand_id, category_id, model, description, collection, gender, condition,
      condition_notes, defects, origin_country, color, price, compare_at_price, status, is_featured, created_by
    )
    values (
      p_product ->> 'slug', p_product ->> 'name', (p_product ->> 'brand_id')::uuid,
      nullif(p_product ->> 'category_id', '')::uuid, nullif(p_product ->> 'model', ''),
      coalesce(p_product ->> 'description', ''), (p_product ->> 'collection')::public.product_collection,
      coalesce(nullif(p_product ->> 'gender', ''), 'unisex')::public.gender,
      (p_product ->> 'condition')::public.condition_grade, nullif(p_product ->> 'condition_notes', ''),
      coalesce(p_product -> 'defects', '[]'::jsonb), nullif(p_product ->> 'origin_country', ''),
      nullif(p_product ->> 'color', ''), (p_product ->> 'price')::numeric,
      nullif(p_product ->> 'compare_at_price', '')::numeric,
      coalesce(nullif(p_product ->> 'status', ''), 'draft')::public.product_status,
      coalesce((p_product ->> 'is_featured')::boolean, false), (select auth.uid())
    )
    returning id into v_id;
  else
    update public.products set
      slug             = p_product ->> 'slug',
      name             = p_product ->> 'name',
      brand_id         = (p_product ->> 'brand_id')::uuid,
      category_id      = nullif(p_product ->> 'category_id', '')::uuid,
      model            = nullif(p_product ->> 'model', ''),
      description      = coalesce(p_product ->> 'description', ''),
      collection       = (p_product ->> 'collection')::public.product_collection,
      gender           = coalesce(nullif(p_product ->> 'gender', ''), 'unisex')::public.gender,
      condition        = (p_product ->> 'condition')::public.condition_grade,
      condition_notes  = nullif(p_product ->> 'condition_notes', ''),
      defects          = coalesce(p_product -> 'defects', '[]'::jsonb),
      origin_country   = nullif(p_product ->> 'origin_country', ''),
      color            = nullif(p_product ->> 'color', ''),
      price            = (p_product ->> 'price')::numeric,
      compare_at_price = nullif(p_product ->> 'compare_at_price', '')::numeric,
      status           = coalesce(nullif(p_product ->> 'status', ''), 'draft')::public.product_status,
      is_featured      = coalesce((p_product ->> 'is_featured')::boolean, false)
    where id = v_id;
    if not found then
      raise exception 'Product not found' using errcode = 'P0002';
    end if;
  end if;

  if v_cost is not null then
    insert into public.product_costs (product_id, purchase_price, supplier_ref, updated_by)
    values (v_id, v_cost, nullif(p_product ->> 'supplier_ref', ''), (select auth.uid()))
    on conflict (product_id) do update
      set purchase_price = excluded.purchase_price,
          supplier_ref   = excluded.supplier_ref,
          updated_by     = excluded.updated_by;
  elsif (p_product ? 'purchase_price') then
    delete from public.product_costs where product_id = v_id;
  end if;

  delete from public.product_variants v
   where v.product_id = v_id
     and v.id not in (
       select (e ->> 'id')::uuid from jsonb_array_elements(p_variants) e where coalesce(e ->> 'id', '') <> ''
     );

  for v_variant in select * from jsonb_array_elements(p_variants)
  loop
    if coalesce(v_variant ->> 'id', '') <> '' then
      update public.product_variants set
        sku            = upper(v_variant ->> 'sku'),
        size_system    = coalesce(nullif(v_variant ->> 'size_system', ''), 'EU')::public.size_system,
        size_value     = v_variant ->> 'size_value',
        quantity       = (v_variant ->> 'quantity')::integer,
        price_override = nullif(v_variant ->> 'price_override', '')::numeric
      where id = (v_variant ->> 'id')::uuid and product_id = v_id;
      if not found then
        raise exception 'Variant does not belong to this product' using errcode = '22023';
      end if;
    else
      insert into public.product_variants (product_id, sku, size_system, size_value, quantity, price_override)
      values (
        v_id, upper(v_variant ->> 'sku'),
        coalesce(nullif(v_variant ->> 'size_system', ''), 'EU')::public.size_system,
        v_variant ->> 'size_value', (v_variant ->> 'quantity')::integer,
        nullif(v_variant ->> 'price_override', '')::numeric
      );
    end if;
  end loop;

  update public.products p
     set status = case when exists (select 1 from public.product_variants v where v.product_id = v_id and v.quantity > 0)
                       then 'active'::public.product_status else 'sold_out'::public.product_status end
   where p.id = v_id and p.status in ('active', 'sold_out');

  return v_id;
end;
$$;

-- ── Dashboard overview (staff) ──────────────────────────────────────────────
-- All figures are computed in Pakistan time. "Sales" exclude cancelled and refunded orders.
create or replace function public.dashboard_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_start date;
  v_threshold integer;
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Only staff can view the dashboard' using errcode = '42501';
  end if;
  p_days := least(greatest(coalesce(p_days, 30), 1), 365);
  v_start := v_today - (p_days - 1);
  select low_stock_threshold into v_threshold from public.store_settings where id;

  with
  ord as (
    select o.*, (o.created_at at time zone 'Asia/Karachi')::date as day
      from public.orders o
     where (o.created_at at time zone 'Asia/Karachi')::date >= v_start
  ),
  sales as (select * from ord where status not in ('cancelled', 'refunded')),
  stock as (
    select p.id, p.collection, p.status,
           coalesce(sum(v.quantity), 0)::integer as pairs,
           coalesce(sum(v.quantity * coalesce(v.price_override, p.price)), 0) as retail_value,
           max(c.purchase_price) as cost
      from public.products p
      left join public.product_variants v on v.product_id = p.id
      left join public.product_costs c on c.product_id = p.id
     where p.status in ('active', 'sold_out')
     group by p.id
  )
  select jsonb_build_object(
    'range_days', p_days,
    'start_date', v_start,
    'end_date', v_today,
    'low_stock_threshold', v_threshold,
    'sales', (select coalesce(sum(total), 0) from sales),
    'orders', (select count(*) from sales),
    'avg_order_value', (select coalesce(round(avg(total), 2), 0) from sales),
    'pairs_sold', (select coalesce(sum(oi.quantity), 0) from public.order_items oi join sales s on s.id = oi.order_id),
    'gross_margin', (
      select coalesce(sum(oi.line_total - oi.quantity * c.purchase_price), 0)
        from public.order_items oi join sales s on s.id = oi.order_id
        join public.product_costs c on c.product_id = oi.product_id
    ),
    'margin_coverage', (
      select case when count(*) = 0 then 1 else round(count(c.product_id)::numeric / count(*), 2) end
        from public.order_items oi join sales s on s.id = oi.order_id
        left join public.product_costs c on c.product_id = oi.product_id
    ),
    'cancelled', (select count(*) from ord where status = 'cancelled'),
    'pending_orders', (select count(*) from public.orders where status = 'pending'),
    'to_ship', (select count(*) from public.orders where status in ('confirmed', 'processing')),
    'in_transit', (select count(*) from public.orders where status = 'shipped'),
    'unpaid_delivered', (select count(*) from public.orders where status = 'delivered' and payment_status = 'pending'),
    'open_returns', (select count(*) from public.returns where status in ('requested', 'approved', 'received')),
    'inventory', jsonb_build_object(
      'pairs', (select coalesce(sum(pairs), 0) from stock),
      'listings_in_stock', (select count(*) from stock where pairs > 0),
      'retail_value', (select coalesce(sum(retail_value), 0) from stock),
      'cost_value', (select coalesce(sum(pairs * cost), 0) from stock where cost is not null),
      'cost_coverage', (select case when count(*) filter (where pairs > 0) = 0 then 1
                                    else round(count(*) filter (where pairs > 0 and cost is not null)::numeric
                                               / count(*) filter (where pairs > 0), 2) end from stock),
      'low_stock', (select count(*) from stock where pairs > 0 and pairs <= v_threshold),
      'sold_out', (select count(*) from stock where pairs = 0)
    ),
    'daily', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0)) order by d)
        from generate_series(v_start, v_today, interval '1 day') d
        left join (select day, sum(total) as sales, count(*) as n from sales group by day) x on x.day = d::date
    ),
    'by_status', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) as n from ord group by status) t
    ),
    'by_collection', (
      select jsonb_agg(jsonb_build_object(
               'collection', c.collection,
               'pairs', coalesce((select sum(pairs) from stock s where s.collection = c.collection), 0),
               'sold', coalesce((select sum(oi.quantity) from public.order_items oi join sales s on s.id = oi.order_id
                                  where oi.collection = c.collection), 0)
             ) order by c.collection)
        from (select unnest(enum_range(null::public.product_collection)) as collection) c
    ),
    'top_brands', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
        select oi.brand_name as brand, sum(oi.quantity) as pairs, sum(oi.line_total) as revenue
          from public.order_items oi join sales s on s.id = oi.order_id
         group by oi.brand_name order by 3 desc limit 5
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ── Customers (staff) ───────────────────────────────────────────────────────
create or replace function public.customer_summaries(p_search text default null, p_limit integer default 100)
returns table (
  id uuid, full_name text, email text, phone text, city text, created_at timestamptz,
  orders_count bigint, total_spent numeric, last_order_at timestamptz, open_returns bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_term text := nullif(trim(p_search), '');
begin
  if not public.is_staff() then
    raise exception 'Only staff can view customers' using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name, p.email, p.phone, p.city, p.created_at,
         count(o.id) filter (where o.status <> 'cancelled'),
         coalesce(sum(o.total) filter (where o.status not in ('cancelled', 'refunded')), 0),
         max(o.created_at),
         (select count(*) from public.returns r where r.user_id = p.id and r.status in ('requested', 'approved', 'received'))
    from public.profiles p
    left join public.orders o on o.user_id = p.id
   where p.role = 'customer'
     and (v_term is null
          or p.email ilike '%' || v_term || '%'
          or p.full_name ilike '%' || v_term || '%'
          or p.phone ilike '%' || v_term || '%')
   group by p.id
   order by max(o.created_at) desc nulls last, p.created_at desc
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

-- ── Execute privileges ──────────────────────────────────────────────────────
revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.request_return(uuid, integer, public.return_reason, text) from public, anon;
revoke execute on function public.update_return(uuid, public.return_status, boolean, numeric, text) from public, anon;
revoke execute on function public.dashboard_summary(integer) from public, anon;
revoke execute on function public.customer_summaries(text, integer) from public, anon;
revoke execute on function public.record_payment(uuid, public.payment_status, text, text) from public, anon;
revoke execute on function public.save_product(jsonb, jsonb) from public, anon;

grant execute on function public.request_return(uuid, integer, public.return_reason, text) to authenticated;
grant execute on function public.update_return(uuid, public.return_status, boolean, numeric, text) to authenticated;
grant execute on function public.dashboard_summary(integer) to authenticated;
grant execute on function public.customer_summaries(text, integer) to authenticated;
grant execute on function public.record_payment(uuid, public.payment_status, text, text) to authenticated;
grant execute on function public.save_product(jsonb, jsonb) to authenticated;
