-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0008 · Owner finance: investments, suppliers, stock purchases,
--                     import costs, expenses, courier settlements, P&L, cash flow
-- ════════════════════════════════════════════════════════════════════════════
-- ADMIN ONLY. Every table here is readable and writable by admins only; every
-- function checks is_admin(). Shopkeepers see none of it.
--
-- Accounting rules (single source of truth: private.finance_events + private.fin_statement)
--   Revenue is recognised when an order is DELIVERED (orders.delivered_at).
--   Cancelled orders and courier returns (RTO) never become revenue.
--   Net Sales      = Gross sales − Discounts − Sales returns (refunds) + Delivery charges collected
--   COGS           = Σ delivered units × landed unit cost (snapshotted at checkout)
--                    − Σ units received back into stock from customer returns
--   Gross Profit   = Net Sales − COGS
--   Operating exp. = advertising + packaging + delivery costs paid + other
--   Net Profit     = Gross Profit − Operating expenses
--   Stock purchases and import/shipping costs are INVENTORY (landed cost), not expenses:
--   they reach the P&L only through COGS when a pair is sold. Unsold stock never does.
--   Investments / withdrawals are owner equity: cash-flow (financing) only, never revenue.
--   Cash flow is cash basis: receipts when money is received (COD when the courier
--   settles), refunds when paid out, expenses/purchases on their payment date.

-- ── Delivery charge customers pay (feeds Delivery charges collected) ────────
alter table public.store_settings
  add column delivery_charge         numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  add column free_delivery_threshold numeric(12, 2) check (free_delivery_threshold >= 0);

create or replace function private.shipping_fee_for(p_subtotal numeric)
returns numeric(12, 2)
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when s.free_delivery_threshold is not null and p_subtotal >= s.free_delivery_threshold then 0
           else s.delivery_charge
         end::numeric(12, 2)
    from public.store_settings s where s.id;
$$;

-- ── Payment references are informational, not unique ────────────────────────
-- One bank transfer or one courier settlement can legitimately cover several orders.
drop index if exists public.payments_provider_reference_key;
create index payments_provider_reference_idx on public.payments (provider_reference) where provider_reference is not null;

-- ── Orders: returned-to-sender timestamp ────────────────────────────────────
alter table public.orders add column returned_at timestamptz;

-- ── Unit cost snapshot per sold item (admin only; customers read order_items) ─
create table public.order_item_costs (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  unit_cost     numeric(12, 2) not null check (unit_cost >= 0),
  created_at    timestamptz not null default now()
);

create or replace function private.snapshot_order_item_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_item_costs (order_item_id, unit_cost)
  select new.id, c.purchase_price from public.product_costs c where c.product_id = new.product_id;
  return new;
end;
$$;

create trigger order_items_snapshot_cost
  after insert on public.order_items
  for each row execute function private.snapshot_order_item_cost();

alter table public.order_item_costs enable row level security;
create policy "order_item_costs: admin read" on public.order_item_costs for select to authenticated
  using ((select public.is_admin()));
revoke all on public.order_item_costs from anon;
revoke insert, update, delete on public.order_item_costs from authenticated;

-- ── Owner investments ───────────────────────────────────────────────────────
create type public.investment_type as enum ('initial', 'additional', 'withdrawal');

create table public.investments (
  id          uuid primary key default gen_random_uuid(),
  type        public.investment_type not null,
  amount      numeric(12, 2) not null check (amount > 0),
  invested_on date not null,
  investor    text not null check (char_length(investor) between 1 and 120),
  method      text check (char_length(method) <= 40),
  notes       text check (char_length(notes) <= 1000),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index investments_date_idx on public.investments (invested_on);
create trigger investments_set_updated_at before update on public.investments
  for each row execute function private.set_updated_at();

-- ── Suppliers ───────────────────────────────────────────────────────────────
create table public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 120),
  country      text check (char_length(country) <= 60),
  contact_name text check (char_length(contact_name) <= 120),
  phone        text check (char_length(phone) <= 40),
  email        text check (char_length(email) <= 254),
  notes        text check (char_length(notes) <= 2000),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index suppliers_name_ci_key on public.suppliers (lower(name));
create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function private.set_updated_at();

-- ── Imported stock purchases (bales / shipments) ────────────────────────────
create type public.purchase_status as enum ('ordered', 'in_transit', 'received');
create type public.purchase_cost_type as enum ('freight', 'customs_duty', 'clearing', 'local_transport', 'other');

create table public.stock_purchases (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique check (char_length(reference) between 1 and 60),
  supplier_id   uuid references public.suppliers (id) on delete restrict,
  purchase_date date not null,
  pairs_count   integer not null check (pairs_count > 0),
  -- PKR paid to the supplier for the goods (convert foreign currency at the rate actually paid).
  goods_cost    numeric(12, 2) not null check (goods_cost >= 0),
  status        public.purchase_status not null default 'received',
  received_on   date,
  description   text check (char_length(description) <= 500),
  notes         text check (char_length(notes) <= 2000),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index stock_purchases_date_idx on public.stock_purchases (purchase_date);
create index stock_purchases_supplier_idx on public.stock_purchases (supplier_id);
create trigger stock_purchases_set_updated_at before update on public.stock_purchases
  for each row execute function private.set_updated_at();

-- Import & shipping costs, capitalised into the landed cost of the purchase.
create table public.purchase_costs (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.stock_purchases (id) on delete cascade,
  cost_type   public.purchase_cost_type not null,
  amount      numeric(12, 2) not null check (amount > 0),
  cost_date   date not null,
  vendor      text check (char_length(vendor) <= 120),
  notes       text check (char_length(notes) <= 1000),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index purchase_costs_purchase_idx on public.purchase_costs (purchase_id);
create index purchase_costs_date_idx on public.purchase_costs (cost_date);

-- Which purchase a product's pairs came from.
alter table public.product_costs
  add column purchase_id uuid references public.stock_purchases (id) on delete set null;
create index product_costs_purchase_idx on public.product_costs (purchase_id);

create view public.stock_purchase_summary
with (security_invoker = true)
as
select sp.*,
       coalesce(c.import_costs, 0)::numeric(12, 2)                                         as import_costs,
       (sp.goods_cost + coalesce(c.import_costs, 0))::numeric(12, 2)                       as landed_cost,
       round((sp.goods_cost + coalesce(c.import_costs, 0)) / sp.pairs_count, 2)::numeric(12, 2) as landed_unit_cost,
       coalesce(l.linked_products, 0)::integer                                             as linked_products,
       s.name                                                                              as supplier_name
  from public.stock_purchases sp
  left join (select purchase_id, sum(amount) as import_costs from public.purchase_costs group by purchase_id) c
         on c.purchase_id = sp.id
  left join (select purchase_id, count(*) as linked_products from public.product_costs
              where purchase_id is not null group by purchase_id) l
         on l.purchase_id = sp.id
  left join public.suppliers s on s.id = sp.supplier_id;

-- ── Operating expenses ──────────────────────────────────────────────────────
create type public.expense_category as enum ('advertising', 'packaging', 'delivery', 'other');

create table public.courier_settlements (
  id               uuid primary key default gen_random_uuid(),
  courier          text not null check (char_length(courier) between 1 and 60),
  reference        text check (char_length(reference) <= 80),
  settled_on       date not null,
  orders_count     integer not null default 0 check (orders_count >= 0),
  gross_cod        numeric(12, 2) not null check (gross_cod >= 0),
  courier_charges  numeric(12, 2) not null default 0 check (courier_charges >= 0),
  other_deductions numeric(12, 2) not null default 0 check (other_deductions >= 0),
  -- Can be negative when only return charges were settled (the shop paid the courier).
  net_received     numeric(12, 2) generated always as (gross_cod - courier_charges - other_deductions) stored,
  notes            text check (char_length(notes) <= 1000),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index courier_settlements_date_idx on public.courier_settlements (settled_on desc);

alter table public.orders
  add column courier_settlement_id uuid references public.courier_settlements (id) on delete restrict;
create index orders_pending_cod_idx on public.orders (status)
  where payment_method = 'cod' and payment_status = 'pending';

create table public.expenses (
  id                    uuid primary key default gen_random_uuid(),
  category              public.expense_category not null,
  subcategory           text check (char_length(subcategory) <= 60),
  description           text not null check (char_length(description) between 2 and 200),
  amount                numeric(12, 2) not null check (amount > 0),
  expense_date          date not null,
  payment_method        text not null default 'cash'
                        check (payment_method in ('cash', 'bank', 'card', 'wallet', 'deducted_by_courier')),
  vendor                text check (char_length(vendor) <= 120),
  reference             text check (char_length(reference) <= 80),
  courier_settlement_id uuid references public.courier_settlements (id) on delete cascade,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (expense_date);
create index expenses_category_idx on public.expenses (category, expense_date);
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function private.set_updated_at();

-- ── RLS: admin only ─────────────────────────────────────────────────────────
alter table public.investments         enable row level security;
alter table public.suppliers           enable row level security;
alter table public.stock_purchases     enable row level security;
alter table public.purchase_costs      enable row level security;
alter table public.courier_settlements enable row level security;
alter table public.expenses            enable row level security;

create policy "investments: admin all" on public.investments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "suppliers: admin all" on public.suppliers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "stock_purchases: admin all" on public.stock_purchases for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "purchase_costs: admin all" on public.purchase_costs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Settlements are created only by record_courier_settlement() and never edited.
create policy "courier_settlements: admin read" on public.courier_settlements for select to authenticated
  using ((select public.is_admin()));
revoke insert, update, delete on public.courier_settlements from authenticated;

-- Expenses generated by a settlement are locked (edit the settlement story via notes instead).
create policy "expenses: admin read" on public.expenses for select to authenticated
  using ((select public.is_admin()));
create policy "expenses: admin insert" on public.expenses for insert to authenticated
  with check ((select public.is_admin()) and courier_settlement_id is null);
create policy "expenses: admin update manual" on public.expenses for update to authenticated
  using ((select public.is_admin()) and courier_settlement_id is null)
  with check ((select public.is_admin()) and courier_settlement_id is null);
create policy "expenses: admin delete manual" on public.expenses for delete to authenticated
  using ((select public.is_admin()) and courier_settlement_id is null);

revoke all on public.investments, public.suppliers, public.stock_purchases, public.purchase_costs,
              public.courier_settlements, public.expenses, public.stock_purchase_summary from anon;

-- ── Order lifecycle: add "returned" (courier return to sender) ──────────────
create or replace function public.update_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order   public.orders;
  v_allowed public.order_status[];
  v_item    record;
begin
  if not public.is_staff() then
    raise exception 'Only staff can update orders' using errcode = '42501';
  end if;
  if p_status = 'cancelled' then
    return public.cancel_order(p_order_id, null);
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  -- Refunds after delivery go through returns (update_return), which records the money.
  v_allowed := case v_order.status
    when 'pending'    then array['confirmed']::public.order_status[]
    when 'confirmed'  then array['processing', 'shipped']::public.order_status[]
    when 'processing' then array['shipped']::public.order_status[]
    when 'shipped'    then array['delivered', 'returned']::public.order_status[]
    else array[]::public.order_status[]
  end;

  if not (p_status = any (v_allowed)) then
    raise exception 'Cannot move an order from % to %', v_order.status, p_status using errcode = '22023';
  end if;

  if p_status = 'returned' then
    -- Parcel came back undelivered: pairs go back on sale, COD will never be collected.
    for v_item in
      select variant_id, quantity from public.order_items
       where order_id = p_order_id and variant_id is not null order by variant_id
    loop
      perform private.apply_stock_change(v_item.variant_id, v_item.quantity, 'return', 'Returned by courier', p_order_id);
    end loop;
    update public.payments set status = 'failed' where order_id = p_order_id and status = 'pending';
  end if;

  update public.orders
     set status         = p_status,
         confirmed_at   = case when p_status = 'confirmed' then now() else confirmed_at end,
         shipped_at     = case when p_status = 'shipped'   then now() else shipped_at end,
         delivered_at   = case when p_status = 'delivered' then now() else delivered_at end,
         returned_at    = case when p_status = 'returned'  then now() else returned_at end,
         payment_status = case when p_status = 'returned' and payment_status = 'pending' then 'failed' else payment_status end
   where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ── Payments: every cash event is its own row ───────────────────────────────
-- paid row = money received (paid_at); refunded row = money paid back (paid_at = refund date).
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
  v_order    public.orders;
  v_payment  public.payments;
  v_paid     numeric(12, 2);
  v_refunded numeric(12, 2);
begin
  if not public.is_staff() then
    raise exception 'Only staff can record payments' using errcode = '42501';
  end if;
  if p_status = 'refunded' and not public.is_admin() then
    raise exception 'Only admins can mark payments as refunded' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if p_status = 'refunded' then
    select coalesce(sum(amount) filter (where status = 'paid'), 0),
           coalesce(sum(amount) filter (where status = 'refunded'), 0)
      into v_paid, v_refunded
      from public.payments where order_id = p_order_id;
    if v_paid - v_refunded <= 0 then
      raise exception 'Nothing to refund: no payment has been received for this order' using errcode = '22023';
    end if;
    insert into public.payments (order_id, method, status, amount, provider_reference, notes, paid_at, recorded_by)
    values (p_order_id, v_order.payment_method, 'refunded', v_paid - v_refunded,
            nullif(trim(p_reference), ''), coalesce(nullif(trim(p_notes), ''), 'Order refund'), now(), (select auth.uid()))
    returning * into v_payment;
    update public.orders set payment_status = 'refunded' where id = p_order_id;
    return v_payment;
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
         paid_at            = case when p_status = 'paid' then coalesce(paid_at, now()) else null end,
         recorded_by        = (select auth.uid())
   where id = v_payment.id
  returning * into v_payment;

  update public.orders set payment_status = p_status where id = p_order_id;
  return v_payment;
end;
$$;

-- ── Courier COD settlement ──────────────────────────────────────────────────
-- Courier collected cash on delivery and remits it minus charges. Receipts are
-- recorded gross (one paid row per order); charges become delivery expenses paid
-- by deduction, so net cash equals the amount actually received.
create or replace function public.record_courier_settlement(
  p_courier          text,
  p_settled_on       date,
  p_order_ids        uuid[],
  p_courier_charges  numeric default 0,
  p_other_deductions numeric default 0,
  p_reference        text default null,
  p_notes            text default null
)
returns public.courier_settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids        uuid[] := coalesce(p_order_ids, array[]::uuid[]);
  v_found      integer;
  v_bad        text;
  v_gross      numeric(12, 2);
  v_settlement public.courier_settlements;
  v_paid_at    timestamptz := (p_settled_on + time '12:00') at time zone 'Asia/Karachi';
begin
  if not public.is_admin() then
    raise exception 'Only admins can record courier settlements' using errcode = '42501';
  end if;
  if nullif(trim(p_courier), '') is null or p_settled_on is null then
    raise exception 'Courier and settlement date are required' using errcode = '22023';
  end if;
  if p_settled_on > (now() at time zone 'Asia/Karachi')::date then
    raise exception 'Settlement date cannot be in the future' using errcode = '22023';
  end if;
  if coalesce(p_courier_charges, 0) < 0 or coalesce(p_other_deductions, 0) < 0 then
    raise exception 'Charges cannot be negative' using errcode = '22023';
  end if;
  if cardinality(v_ids) = 0 and coalesce(p_courier_charges, 0) + coalesce(p_other_deductions, 0) = 0 then
    raise exception 'Select orders or enter charges to settle' using errcode = '22023';
  end if;

  perform 1 from public.orders where id = any (v_ids) order by id for update;
  select count(*) into v_found from public.orders where id = any (v_ids);
  if v_found <> (select count(distinct x) from unnest(v_ids) x) then
    raise exception 'Some orders were not found' using errcode = 'P0002';
  end if;

  select string_agg(order_number, ', ') into v_bad
    from public.orders
   where id = any (v_ids)
     and not (payment_method = 'cod' and status = 'delivered' and payment_status = 'pending'
              and courier_settlement_id is null);
  if v_bad is not null then
    raise exception 'Not unsettled delivered COD orders: %', v_bad using errcode = '22023';
  end if;

  select coalesce(sum(total), 0) into v_gross from public.orders where id = any (v_ids);

  insert into public.courier_settlements
    (courier, reference, settled_on, orders_count, gross_cod, courier_charges, other_deductions, notes, created_by)
  values (trim(p_courier), nullif(trim(p_reference), ''), p_settled_on, v_found, v_gross,
          coalesce(p_courier_charges, 0), coalesce(p_other_deductions, 0), nullif(trim(p_notes), ''), (select auth.uid()))
  returning * into v_settlement;

  update public.payments p
     set status = 'paid', paid_at = v_paid_at,
         provider_reference = coalesce(v_settlement.reference, v_settlement.courier) || ' / ' || o.order_number,
         recorded_by = (select auth.uid())
    from public.orders o
   where o.id = p.order_id and p.order_id = any (v_ids) and p.status = 'pending';

  update public.orders
     set payment_status = 'paid', courier_settlement_id = v_settlement.id
   where id = any (v_ids);

  if v_settlement.courier_charges > 0 then
    insert into public.expenses (category, subcategory, description, amount, expense_date, payment_method, vendor,
                                 reference, courier_settlement_id, created_by)
    values ('delivery', 'Courier charges', 'Courier charges deducted from COD settlement', v_settlement.courier_charges,
            p_settled_on, 'deducted_by_courier', v_settlement.courier, v_settlement.reference, v_settlement.id,
            (select auth.uid()));
  end if;
  if v_settlement.other_deductions > 0 then
    insert into public.expenses (category, subcategory, description, amount, expense_date, payment_method, vendor,
                                 reference, courier_settlement_id, created_by)
    values ('other', 'Courier deductions', 'Other deductions on COD settlement', v_settlement.other_deductions,
            p_settled_on, 'deducted_by_courier', v_settlement.courier, v_settlement.reference, v_settlement.id,
            (select auth.uid()));
  end if;

  return v_settlement;
end;
$$;

-- ── Link products to a stock purchase and apply its landed unit cost ────────
-- p_product_ids NULL = re-apply to every product already linked (after adding import costs).
-- Affects future sales only: items already sold keep their snapshotted cost.
create or replace function public.assign_products_to_purchase(
  p_purchase_id uuid,
  p_product_ids uuid[] default null,
  p_apply_cost  boolean default true
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit  numeric(12, 2);
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can link purchases' using errcode = '42501';
  end if;
  select landed_unit_cost into v_unit from public.stock_purchase_summary where id = p_purchase_id;
  if not found then
    raise exception 'Purchase not found' using errcode = 'P0002';
  end if;

  if p_product_ids is null then
    update public.product_costs
       set purchase_price = case when p_apply_cost then v_unit else purchase_price end,
           updated_by = (select auth.uid())
     where purchase_id = p_purchase_id;
    get diagnostics v_count = row_count;
  else
    insert into public.product_costs (product_id, purchase_price, purchase_id, updated_by)
    select pid, v_unit, p_purchase_id, (select auth.uid())
      from unnest(p_product_ids) as pid
      join public.products p on p.id = pid
    on conflict (product_id) do update
      set purchase_id    = excluded.purchase_id,
          purchase_price = case when p_apply_cost then excluded.purchase_price else public.product_costs.purchase_price end,
          updated_by     = excluded.updated_by;
    get diagnostics v_count = row_count;
  end if;
  return v_count;
end;
$$;

-- ── Ledger of financial events (one row per amount, Pakistan dates) ─────────
create or replace function private.finance_events()
returns table (day date, k text, amt numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with delivered as (
    select o.*, (o.delivered_at at time zone 'Asia/Karachi')::date as d
      from public.orders o
     where o.delivered_at is not null
  ),
  item_cost as (
    select oi.id, oi.order_id, oi.quantity, oi.line_total, oi.collection,
           coalesce(c.unit_cost, pc.purchase_price) as unit_cost
      from public.order_items oi
      left join public.order_item_costs c on c.order_item_id = oi.id
      left join public.product_costs pc on pc.product_id = oi.product_id
  )
  -- Revenue (recognised on delivery)
  select d, 'gross_sales', subtotal from delivered
  union all select d, 'discounts', discount_total from delivered where discount_total > 0
  union all select d, 'delivery_income', shipping_fee from delivered where shipping_fee > 0
  union all select d, 'orders_delivered', 1 from delivered
  union all select dl.d, 'pairs_sold', ic.quantity from delivered dl join item_cost ic on ic.order_id = dl.id
  -- Cost of goods sold: only units actually delivered
  union all select dl.d, 'cogs', ic.quantity * coalesce(ic.unit_cost, 0) from delivered dl join item_cost ic on ic.order_id = dl.id
  union all select dl.d, 'cogs_missing_units', ic.quantity from delivered dl join item_cost ic on ic.order_id = dl.id
   where ic.unit_cost is null
  -- Customer returns: refunds reduce sales; restocked pairs leave COGS
  union all select (r.refunded_at at time zone 'Asia/Karachi')::date, 'sales_returns', r.refund_amount
    from public.returns r where r.status = 'refunded' and r.refund_amount > 0
  union all select (r.refunded_at at time zone 'Asia/Karachi')::date, 'units_refunded', r.quantity
    from public.returns r where r.status = 'refunded'
  union all select (r.received_at at time zone 'Asia/Karachi')::date, 'cogs', -(r.quantity * coalesce(ic.unit_cost, 0))
    from public.returns r join item_cost ic on ic.id = r.order_item_id
   where r.received_at is not null and r.restock and r.status in ('received', 'refunded')
  -- Operating expenses
  union all select e.expense_date, 'opex_' || e.category::text, e.amount from public.expenses e
  -- Order counts
  union all select (o.created_at at time zone 'Asia/Karachi')::date, 'orders_placed', 1 from public.orders o
  union all select (o.cancelled_at at time zone 'Asia/Karachi')::date, 'orders_cancelled', 1
    from public.orders o where o.status = 'cancelled' and o.cancelled_at is not null
  union all select (o.returned_at at time zone 'Asia/Karachi')::date, 'orders_returned', 1
    from public.orders o where o.returned_at is not null
  -- Cash in / out
  union all select (p.paid_at at time zone 'Asia/Karachi')::date, 'cash_in_sales', p.amount
    from public.payments p where p.status = 'paid' and p.paid_at is not null
  union all select (p.paid_at at time zone 'Asia/Karachi')::date, 'cash_out_refunds', p.amount
    from public.payments p where p.status = 'refunded' and p.paid_at is not null
  union all select e.expense_date, 'cash_out_expenses', e.amount from public.expenses e
  union all select sp.purchase_date, 'cash_out_stock', sp.goods_cost from public.stock_purchases sp where sp.goods_cost > 0
  union all select pc.cost_date, 'cash_out_import', pc.amount from public.purchase_costs pc
  union all select i.invested_on,
                   case when i.type = 'withdrawal' then 'cash_out_withdrawals' else 'cash_in_investment' end,
                   i.amount
    from public.investments i
  union all select i.invested_on, 'investment_' || i.type::text, i.amount from public.investments i
  -- Inventory bought (landed), for reference — never part of COGS
  union all select sp.purchase_date, 'inventory_purchased', sp.goods_cost from public.stock_purchases sp
  union all select pc.cost_date, 'inventory_purchased', pc.amount from public.purchase_costs pc;
$$;

-- ── Statement: derived lines from the raw event totals ──────────────────────
create or replace function private.fin_statement(p jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v jsonb := jsonb_build_object(
    'gross_sales', 0, 'discounts', 0, 'sales_returns', 0, 'delivery_income', 0, 'cogs', 0,
    'opex_advertising', 0, 'opex_packaging', 0, 'opex_delivery', 0, 'opex_other', 0,
    'cash_in_sales', 0, 'cash_in_investment', 0, 'cash_out_refunds', 0, 'cash_out_expenses', 0,
    'cash_out_stock', 0, 'cash_out_import', 0, 'cash_out_withdrawals', 0,
    'orders_placed', 0, 'orders_delivered', 0, 'orders_cancelled', 0, 'orders_returned', 0,
    'pairs_sold', 0, 'units_refunded', 0, 'cogs_missing_units', 0, 'inventory_purchased', 0,
    'investment_initial', 0, 'investment_additional', 0, 'investment_withdrawal', 0
  ) || coalesce(p, '{}'::jsonb);
  n_gross numeric := (v ->> 'gross_sales')::numeric;
  n_disc  numeric := (v ->> 'discounts')::numeric;
  n_ret   numeric := (v ->> 'sales_returns')::numeric;
  n_dlv   numeric := (v ->> 'delivery_income')::numeric;
  n_cogs  numeric := (v ->> 'cogs')::numeric;
  n_opex  numeric := (v ->> 'opex_advertising')::numeric + (v ->> 'opex_packaging')::numeric
                   + (v ->> 'opex_delivery')::numeric + (v ->> 'opex_other')::numeric;
  n_net_sales numeric;
  n_gp        numeric;
  n_cash_in   numeric := (v ->> 'cash_in_sales')::numeric + (v ->> 'cash_in_investment')::numeric;
  n_cash_out  numeric := (v ->> 'cash_out_refunds')::numeric + (v ->> 'cash_out_expenses')::numeric
                       + (v ->> 'cash_out_stock')::numeric + (v ->> 'cash_out_import')::numeric
                       + (v ->> 'cash_out_withdrawals')::numeric;
begin
  n_net_sales := n_gross - n_disc - n_ret + n_dlv;
  n_gp := n_net_sales - n_cogs;
  return v || jsonb_build_object(
    'merchandise_net_sales', n_gross - n_disc - n_ret,
    'net_sales',             n_net_sales,
    'gross_profit',          n_gp,
    'gross_margin',          case when n_net_sales <> 0 then round(n_gp / n_net_sales, 4) end,
    'operating_expenses',    n_opex,
    'net_profit',            n_gp - n_opex,
    'net_margin',            case when n_net_sales <> 0 then round((n_gp - n_opex) / n_net_sales, 4) end,
    'delivery_net',          n_dlv - (v ->> 'opex_delivery')::numeric,
    'cash_in',               n_cash_in,
    'cash_out',              n_cash_out,
    'net_cash',              n_cash_in - n_cash_out,
    'operating_cash',        (v ->> 'cash_in_sales')::numeric - (v ->> 'cash_out_refunds')::numeric
                             - (v ->> 'cash_out_expenses')::numeric - (v ->> 'cash_out_stock')::numeric
                             - (v ->> 'cash_out_import')::numeric,
    'financing_cash',        (v ->> 'cash_in_investment')::numeric - (v ->> 'cash_out_withdrawals')::numeric
  );
end;
$$;

-- ── Finance report (admin) ──────────────────────────────────────────────────
create or replace function public.finance_report(p_from date, p_to date, p_granularity text default 'day')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_unit   text;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only admins can view financial reports' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Choose a valid date range' using errcode = '22023';
  end if;
  if p_to - p_from > 3700 then
    raise exception 'Date range is too long (max 10 years)' using errcode = '22023';
  end if;
  v_unit := case p_granularity when 'day' then 'day' when 'week' then 'week' when 'month' then 'month' when 'year' then 'year' end;
  if v_unit is null then
    raise exception 'Granularity must be day, week, month or year' using errcode = '22023';
  end if;
  if v_unit = 'day' and p_to - p_from > 400 then
    raise exception 'Use weekly or monthly view for ranges over 400 days' using errcode = '22023';
  end if;

  with ev as (select * from private.finance_events()),
  rng as (select * from ev where day between p_from and p_to),
  buckets as (
    select gs::date as b
      from generate_series(date_trunc(v_unit, p_from::timestamp), date_trunc(v_unit, p_to::timestamp),
                           ('1 ' || v_unit)::interval) gs
  ),
  agg as (select date_trunc(v_unit, day::timestamp)::date as b, k, sum(amt) as s from rng group by 1, 2),
  delivered_items as (
    select oi.*, o.payment_method
      from public.order_items oi join public.orders o on o.id = oi.order_id
     where o.delivered_at is not null
       and (o.delivered_at at time zone 'Asia/Karachi')::date between p_from and p_to
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'granularity', v_unit,
    'totals', private.fin_statement((select jsonb_object_agg(k, s) from (select k, sum(amt) as s from rng group by k) t)),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bk.b)
                       || private.fin_statement((select jsonb_object_agg(a.k, a.s) from agg a where a.b = bk.b))
                       order by bk.b)
        from buckets bk), '[]'::jsonb),
    'opening_cash', (select coalesce(sum(case when k like 'cash\_in\_%' then amt when k like 'cash\_out\_%' then -amt else 0 end), 0)
                       from ev where day < p_from),
    'closing_cash', (select coalesce(sum(case when k like 'cash\_in\_%' then amt when k like 'cash\_out\_%' then -amt else 0 end), 0)
                       from ev where day <= p_to),
    'equity', (select jsonb_build_object(
                 'invested', coalesce(sum(amount) filter (where type <> 'withdrawal'), 0),
                 'withdrawn', coalesce(sum(amount) filter (where type = 'withdrawal'), 0))
                 from public.investments where invested_on <= p_to),
    'inventory', (select jsonb_build_object(
                    'pairs', coalesce(sum(v.quantity), 0),
                    'cost_value', coalesce(sum(v.quantity * pc.purchase_price), 0),
                    'retail_value', coalesce(sum(v.quantity * coalesce(v.price_override, p.price)), 0),
                    'pairs_without_cost', coalesce(sum(v.quantity) filter (where pc.purchase_price is null), 0))
                    from public.product_variants v
                    join public.products p on p.id = v.product_id
                    left join public.product_costs pc on pc.product_id = p.id),
    'pending_cod', (select jsonb_build_object(
                      'delivered_amount', coalesce(sum(total) filter (where status = 'delivered'), 0),
                      'delivered_orders', count(*) filter (where status = 'delivered'),
                      'in_transit_amount', coalesce(sum(total) filter (where status = 'shipped'), 0),
                      'in_transit_orders', count(*) filter (where status = 'shipped'),
                      'oldest_delivered_at', min(delivered_at) filter (where status = 'delivered'),
                      'by_courier', coalesce((
                        select jsonb_agg(jsonb_build_object('courier', c, 'orders', n, 'amount', a) order by a desc)
                          from (select coalesce(courier, 'Unassigned') as c, count(*) as n, sum(total) as a
                                  from public.orders
                                 where payment_method = 'cod' and payment_status = 'pending' and status = 'delivered'
                                 group by 1) t), '[]'::jsonb))
                      from public.orders
                     where payment_method = 'cod' and payment_status = 'pending' and status in ('shipped', 'delivered')),
    'sales_by_collection', coalesce((
      select jsonb_agg(jsonb_build_object('collection', collection, 'pairs', pairs, 'sales', sales) order by sales desc)
        from (select collection, sum(quantity) as pairs, sum(line_total) as sales from delivered_items group by 1) t), '[]'::jsonb),
    'sales_by_brand', coalesce((
      select jsonb_agg(jsonb_build_object('brand', brand_name, 'pairs', pairs, 'sales', sales) order by sales desc)
        from (select brand_name, sum(quantity) as pairs, sum(line_total) as sales
                from delivered_items group by 1 order by 3 desc limit 10) t), '[]'::jsonb),
    'sales_by_payment_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', payment_method, 'orders', orders, 'sales', sales) order by sales desc)
        from (select payment_method, count(distinct order_id) as orders, sum(line_total) as sales
                from delivered_items group by 1) t), '[]'::jsonb),
    'expenses_by_subcategory', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'subcategory', sub, 'amount', amount) order by amount desc)
        from (select category, coalesce(subcategory, 'General') as sub, sum(amount) as amount
                from public.expenses where expense_date between p_from and p_to group by 1, 2) t), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ── Execute privileges ──────────────────────────────────────────────────────
revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.update_order_status(uuid, public.order_status) from public, anon;
revoke execute on function public.record_payment(uuid, public.payment_status, text, text) from public, anon;
revoke execute on function public.record_courier_settlement(text, date, uuid[], numeric, numeric, text, text) from public, anon;
revoke execute on function public.assign_products_to_purchase(uuid, uuid[], boolean) from public, anon;
revoke execute on function public.finance_report(date, date, text) from public, anon;

grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.record_payment(uuid, public.payment_status, text, text) to authenticated;
grant execute on function public.record_courier_settlement(text, date, uuid[], numeric, numeric, text, text) to authenticated;
grant execute on function public.assign_products_to_purchase(uuid, uuid[], boolean) to authenticated;
grant execute on function public.finance_report(date, date, text) to authenticated;
