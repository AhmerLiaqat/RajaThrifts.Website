-- ════════════════════════════════════════════════════════════════════════════
-- 0010 · Guest checkout (no customer accounts needed)
--
-- Customers order without signing in; only staff/admin log in. Orders keep an
-- optional user_id (orders placed by signed-in users still link to them).
--
-- • orders.user_id / returns.user_id become nullable.
-- • orders.phone_key (last 10 digits of the phone) identifies a customer, for the
--   staff Customers page and for guest order tracking.
-- • private.create_order(): the checkout body of place_order(), shared by
--   place_order() (signed-in only, unchanged behaviour) and
--   place_order_with_proof() (now also open to anonymous visitors).
-- • Anti-hoarding: max 3 unconfirmed orders per phone number (guests) or per account.
-- • Guests upload their transfer screenshot to payment-proofs/guest/{uuid}.{ext};
--   they can write there but never read anything back. Staff read all.
-- • track_order(order_number, phone): a guest sees their own order's status.
-- • customer_summaries(): customers are grouped by phone number.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.orders alter column user_id drop not null;
alter table public.returns alter column user_id drop not null;

alter table public.orders
  add column phone_key text generated always as (right(regexp_replace(contact_phone, '\D', '', 'g'), 10)) stored;
create index orders_phone_key_idx on public.orders (phone_key, created_at desc);

-- ── Shared checkout body ────────────────────────────────────────────────────
create or replace function private.create_order(
  p_user           uuid,
  p_items          jsonb,
  p_contact        jsonb,
  p_address        jsonb,
  p_payment_method public.payment_method,
  p_customer_notes text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order     public.orders;
  v_row       record;
  v_subtotal  numeric(12, 2) := 0;
  v_requested integer;
  v_found     integer := 0;
  v_phone_key text := right(regexp_replace(coalesce(p_contact ->> 'phone', ''), '\D', '', 'g'), 10);
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Too many items in one order' using errcode = '22023';
  end if;
  if p_payment_method = 'card' then
    raise exception 'Card payments are not available yet' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
     where (e ->> 'variant_id') is null
        or (e ->> 'quantity') is null
        or (e ->> 'quantity') !~ '^[0-9]{1,2}$'
        or (e ->> 'quantity')::integer not between 1 and 10
  ) then
    raise exception 'Each item needs a variant and a quantity between 1 and 10' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_contact ->> 'name', ''))) < 2 then
    raise exception 'Please enter your name' using errcode = '22023';
  end if;
  if char_length(v_phone_key) < 10 then
    raise exception 'Please enter a valid phone number' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_address ->> 'line1', ''))) < 5
     or char_length(trim(coalesce(p_address ->> 'city', ''))) < 2 then
    raise exception 'Please enter your full address and city' using errcode = '22023';
  end if;

  -- Stock is reserved at checkout; cap open orders per account (signed in) or per phone (guest).
  if (select count(*) from public.orders
       where status = 'pending'
         and case when p_user is null then phone_key = v_phone_key else user_id = p_user end) >= 3 then
    raise exception 'You already have 3 orders awaiting confirmation. Please wait for them to be confirmed or message us on WhatsApp.'
      using errcode = '22023';
  end if;

  insert into public.orders (
    user_id, payment_method, contact_name, contact_phone, contact_email,
    shipping_address_line1, shipping_address_line2, shipping_city, shipping_province,
    shipping_postal_code, customer_notes
  )
  values (
    p_user,
    p_payment_method,
    trim(p_contact ->> 'name'),
    trim(p_contact ->> 'phone'),
    nullif(trim(p_contact ->> 'email'), ''),
    trim(p_address ->> 'line1'),
    nullif(trim(p_address ->> 'line2'), ''),
    trim(p_address ->> 'city'),
    nullif(trim(p_address ->> 'province'), ''),
    nullif(trim(p_address ->> 'postal_code'), ''),
    nullif(left(trim(p_customer_notes), 500), '')
  )
  returning * into v_order;

  select count(distinct (e ->> 'variant_id')) into v_requested from jsonb_array_elements(p_items) e;

  for v_row in
    with requested as (
      select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) e
       group by 1
    )
    select r.variant_id,
           r.quantity                                as requested_qty,
           v.quantity                                as stock,
           v.sku,
           v.size_system::text || ' ' || v.size_value as size_label,
           coalesce(v.price_override, p.price)       as unit_price,
           p.id                                      as product_id,
           p.name                                    as product_name,
           p.status                                  as product_status,
           p.collection,
           b.name                                    as brand_name,
           (select i.storage_path from public.product_images i
             where i.product_id = p.id order by i.position limit 1) as image_path
      from requested r
      join public.product_variants v on v.id = r.variant_id
      join public.products p on p.id = v.product_id
      join public.brands b on b.id = p.brand_id
     order by r.variant_id
       for update of v
  loop
    v_found := v_found + 1;

    if v_row.product_status <> 'active' or v_row.stock < v_row.requested_qty then
      raise exception '% (%) is no longer available in that quantity', v_row.product_name, v_row.size_label
        using errcode = 'P0001', hint = 'OUT_OF_STOCK';
    end if;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, brand_name, collection,
      size_label, sku, image_path, unit_price, quantity
    )
    values (
      v_order.id, v_row.product_id, v_row.variant_id, v_row.product_name, v_row.brand_name,
      v_row.collection, v_row.size_label, v_row.sku, v_row.image_path, v_row.unit_price, v_row.requested_qty
    );

    perform private.apply_stock_change(v_row.variant_id, -v_row.requested_qty, 'sale', null, v_order.id);
    v_subtotal := v_subtotal + v_row.unit_price * v_row.requested_qty;
  end loop;

  if v_found <> v_requested then
    raise exception 'Some items in your bag are no longer available' using errcode = 'P0001', hint = 'OUT_OF_STOCK';
  end if;

  update public.orders
     set subtotal = v_subtotal,
         shipping_fee = private.shipping_fee_for(v_subtotal)
   where id = v_order.id
  returning * into v_order;

  insert into public.payments (order_id, method, amount)
  values (v_order.id, p_payment_method, v_order.total);

  return v_order;
end;
$$;

-- Signed-in checkout: same behaviour as before, now a thin wrapper.
create or replace function public.place_order(
  p_items          jsonb,
  p_contact        jsonb,
  p_address        jsonb,
  p_payment_method public.payment_method,
  p_customer_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Please sign in to place an order' using errcode = '42501';
  end if;
  return private.create_order((select auth.uid()), p_items, p_contact, p_address, p_payment_method, p_customer_notes);
end;
$$;

-- ── Payment screenshots: guests upload to guest/, never read back ───────────
create policy "payment-proofs: guest upload" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'payment-proofs'
    and name ~ '^guest/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$'
  );

create or replace function private.assert_payment_proof(p_path text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if p_path is null
     or not (
       p_path ~ '^guest/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$'
       or (v_user is not null and p_path ~ ('^' || v_user::text || '/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$'))
     ) then
    raise exception 'Please attach a screenshot of your bank transfer' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_path) then
    raise exception 'The payment screenshot did not upload. Please try again.' using errcode = '22023';
  end if;
  -- One screenshot backs one order.
  if exists (select 1 from public.orders where payment_proof_path = p_path) then
    raise exception 'This screenshot is already attached to another order.' using errcode = '22023';
  end if;
end;
$$;

-- Storefront checkout: guests and signed-in users alike.
create or replace function public.place_order_with_proof(
  p_items          jsonb,
  p_contact        jsonb,
  p_address        jsonb,
  p_customer_notes text,
  p_payment_proof  text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  perform private.assert_payment_proof(p_payment_proof);

  v_order := private.create_order((select auth.uid()), p_items, p_contact, p_address, 'bank_transfer', p_customer_notes);

  update public.orders
     set payment_proof_path = p_payment_proof,
         payment_proof_uploaded_at = now()
   where id = v_order.id
  returning * into v_order;
  return v_order;
end;
$$;

-- ── Guest order tracking ────────────────────────────────────────────────────
-- Order number + the phone used at checkout. Returns only what the customer needs.
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_key   text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  if char_length(v_key) < 10 then
    raise exception 'Order not found. Check the order number and phone number.' using errcode = 'P0002';
  end if;
  select * into v_order from public.orders
   where order_number = upper(trim(p_order_number)) and phone_key = v_key;
  if not found then
    raise exception 'Order not found. Check the order number and phone number.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'has_payment_proof', v_order.payment_proof_path is not null,
    'subtotal', v_order.subtotal,
    'shipping_fee', v_order.shipping_fee,
    'discount_total', v_order.discount_total,
    'total', v_order.total,
    'contact_name', v_order.contact_name,
    'shipping_city', v_order.shipping_city,
    'courier', v_order.courier,
    'tracking_number', v_order.tracking_number,
    'placed_at', v_order.placed_at,
    'confirmed_at', v_order.confirmed_at,
    'shipped_at', v_order.shipped_at,
    'delivered_at', v_order.delivered_at,
    'cancelled_at', v_order.cancelled_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_name', i.product_name, 'brand_name', i.brand_name, 'collection', i.collection,
               'size_label', i.size_label, 'image_path', i.image_path, 'unit_price', i.unit_price,
               'quantity', i.quantity, 'line_total', i.line_total) order by i.created_at)
        from public.order_items i where i.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ── Customers grouped by phone number ───────────────────────────────────────
drop function if exists public.customer_summaries(text, integer);
create function public.customer_summaries(p_search text default null, p_limit integer default 100)
returns table (
  id text, full_name text, email text, phone text, city text, created_at timestamptz,
  orders_count bigint, total_spent numeric, last_order_at timestamptz, open_returns bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_term   text := nullif(trim(p_search), '');
  -- Phone search ignores formatting and a leading 0 / 92 country code (phone_key has neither).
  v_digits text := nullif(regexp_replace(regexp_replace(coalesce(p_search, ''), '\D', '', 'g'), '^(92|0)', ''), '');
begin
  if not public.is_staff() then
    raise exception 'Only staff can view customers' using errcode = '42501';
  end if;

  return query
  with latest as (
    select distinct on (o.phone_key) o.phone_key, o.contact_name, o.contact_email, o.contact_phone, o.shipping_city
      from public.orders o
     order by o.phone_key, o.created_at desc
  )
  select o.phone_key,
         l.contact_name,
         l.contact_email,
         l.contact_phone,
         l.shipping_city,
         min(o.created_at),
         count(o.id) filter (where o.status <> 'cancelled'),
         coalesce(sum(o.total) filter (where o.status not in ('cancelled', 'refunded')), 0),
         max(o.created_at),
         (select count(*) from public.returns r join public.orders ro on ro.id = r.order_id
           where ro.phone_key = o.phone_key and r.status in ('requested', 'approved', 'received'))
    from public.orders o
    join latest l on l.phone_key = o.phone_key
   where v_term is null
      or (v_digits is not null and o.phone_key like '%' || v_digits || '%')
      or exists (select 1 from public.orders s
                  where s.phone_key = o.phone_key
                    and (s.contact_name ilike '%' || v_term || '%' or s.contact_email ilike '%' || v_term || '%'))
   group by o.phone_key, l.contact_name, l.contact_email, l.contact_phone, l.shipping_city
   order by max(o.created_at) desc
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

-- ── Privileges ──────────────────────────────────────────────────────────────
revoke execute on function private.create_order(uuid, jsonb, jsonb, jsonb, public.payment_method, text) from public, anon, authenticated;
revoke execute on function private.assert_payment_proof(text) from public, anon, authenticated;
grant execute on function public.place_order_with_proof(jsonb, jsonb, jsonb, text, text) to anon, authenticated;
revoke execute on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
revoke execute on function public.customer_summaries(text, integer) from public, anon;
grant execute on function public.customer_summaries(text, integer) to authenticated;
