-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0005 · Secure functions: stock, checkout, order lifecycle,
--                     payments, product save
-- ════════════════════════════════════════════════════════════════════════════
-- Conventions
--  * Functions callable from the app live in `public` and check the caller's role.
--  * Internal building blocks live in `private` (not reachable through the API).
--  * SECURITY DEFINER functions pin search_path = '' and fully qualify every name.
--  * Errors use SQLSTATEs the frontend maps to ServiceError codes:
--      42501 → FORBIDDEN, P0002 → NOT_FOUND, 22023 → VALIDATION, 23514 → VALIDATION,
--      P0001 + HINT 'OUT_OF_STOCK' → CONFLICT

-- ── Stock (internal) ────────────────────────────────────────────────────────
create or replace function private.apply_stock_change(
  p_variant_id uuid,
  p_delta      integer,
  p_reason     public.movement_reason,
  p_note       text default null,
  p_order_id   uuid default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement public.inventory_movements;
begin
  if p_delta = 0 then
    raise exception 'Stock change cannot be zero' using errcode = '22023';
  end if;

  -- Tell the ledger trigger this change is already being logged here.
  perform set_config('rajathrifs.movement_logged', 'on', true);

  -- quantity >= 0 check constraint rejects oversells with SQLSTATE 23514.
  update public.product_variants set quantity = quantity + p_delta where id = p_variant_id;
  if not found then
    raise exception 'Variant not found' using errcode = 'P0002';
  end if;

  insert into public.inventory_movements (variant_id, delta, reason, note, order_id, created_by)
  values (p_variant_id, p_delta, p_reason, p_note, p_order_id, (select auth.uid()))
  returning * into v_movement;

  perform set_config('rajathrifs.movement_logged', 'off', true);
  return v_movement;
end;
$$;

-- ── Stock (staff) ───────────────────────────────────────────────────────────
-- Manual corrections: intake of a shipment, damage, stock-count adjustments, returns.
create or replace function public.adjust_stock(
  p_variant_id uuid,
  p_delta      integer,
  p_reason     public.movement_reason,
  p_note       text default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can adjust stock' using errcode = '42501';
  end if;
  if p_reason = 'sale' then
    raise exception 'Sales are recorded by checkout, not manual adjustments' using errcode = '22023';
  end if;
  return private.apply_stock_change(p_variant_id, p_delta, p_reason, p_note, null);
end;
$$;

-- ── Delivery fee ────────────────────────────────────────────────────────────
-- Placeholder: returns 0 until the business sets its delivery pricing.
-- Edit this function (e.g. flat fee, free above a threshold) and the
-- checkout picks it up automatically. Clients can never supply the fee.
create or replace function private.shipping_fee_for(p_subtotal numeric)
returns numeric(12, 2)
language sql
immutable
set search_path = ''
as $$
  select 0::numeric(12, 2);
$$;

-- ── Checkout ────────────────────────────────────────────────────────────────
-- p_items:   [{ "variant_id": uuid, "quantity": int }]
-- p_contact: { "name", "phone", "email" }
-- p_address: { "line1", "line2", "city", "province", "postal_code" }
--
-- Prices come from the database, never the client. Variant rows are locked
-- (FOR UPDATE, in id order to avoid deadlocks), so two buyers can never both
-- get the last pair: the second one receives OUT_OF_STOCK.
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
declare
  v_user      uuid := (select auth.uid());
  v_order     public.orders;
  v_row       record;
  v_subtotal  numeric(12, 2) := 0;
  v_requested integer;
  v_found     integer := 0;
  v_pending   integer;
begin
  if v_user is null then
    raise exception 'Please sign in to place an order' using errcode = '42501';
  end if;

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

  -- Stock is reserved at checkout; cap open orders per customer to stop hoarding.
  select count(*) into v_pending from public.orders where user_id = v_user and status = 'pending';
  if v_pending >= 3 then
    raise exception 'You already have 3 orders awaiting confirmation. Please wait for them to be confirmed.'
      using errcode = '22023';
  end if;

  insert into public.orders (
    user_id, payment_method, contact_name, contact_phone, contact_email,
    shipping_address_line1, shipping_address_line2, shipping_city, shipping_province,
    shipping_postal_code, customer_notes
  )
  values (
    v_user,
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

-- ── Order lifecycle ─────────────────────────────────────────────────────────
-- Returns every pair on the order to stock (cancellation before dispatch).
create or replace function private.restock_order(p_order_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  for v_item in
    select variant_id, quantity from public.order_items
     where order_id = p_order_id and variant_id is not null
     order by variant_id
  loop
    perform private.apply_stock_change(v_item.variant_id, v_item.quantity, 'released', p_note, p_order_id);
  end loop;
end;
$$;

-- Customers can cancel their own order while it is still pending.
-- Staff can cancel any order that has not shipped yet.
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_staff boolean := public.is_staff();
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or (not v_staff and v_order.user_id is distinct from (select auth.uid())) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_staff then
    if v_order.status not in ('pending', 'confirmed', 'processing') then
      raise exception 'Orders that have shipped cannot be cancelled' using errcode = '22023';
    end if;
  elsif v_order.status <> 'pending' then
    raise exception 'This order is already being prepared. Please contact us to cancel it.' using errcode = '22023';
  end if;

  perform private.restock_order(v_order.id, coalesce(left(p_reason, 200), 'Order cancelled'));

  update public.orders
     set status = 'cancelled',
         cancelled_at = now(),
         staff_notes = case when v_staff and p_reason is not null
                            then concat_ws(E'\n', staff_notes, 'Cancelled: ' || left(p_reason, 200))
                            else staff_notes end
   where id = v_order.id
  returning * into v_order;

  update public.payments set status = 'failed' where order_id = v_order.id and status = 'pending';
  return v_order;
end;
$$;

-- Staff move orders forward. Cancellation goes through cancel_order (restocks).
create or replace function public.update_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_allowed public.order_status[];
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

  v_allowed := case v_order.status
    when 'pending'    then array['confirmed']::public.order_status[]
    when 'confirmed'  then array['processing', 'shipped']::public.order_status[]
    when 'processing' then array['shipped']::public.order_status[]
    when 'shipped'    then array['delivered']::public.order_status[]
    when 'delivered'  then array['refunded']::public.order_status[]
    else array[]::public.order_status[]
  end;

  if not (p_status = any (v_allowed)) then
    raise exception 'Cannot move an order from % to %', v_order.status, p_status using errcode = '22023';
  end if;

  update public.orders
     set status       = p_status,
         confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
         shipped_at   = case when p_status = 'shipped'   then now() else shipped_at end,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end
   where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ── Payments (staff) ────────────────────────────────────────────────────────
-- Records the outcome of a payment (COD collected, bank transfer received, refund…).
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

  select * into v_payment from public.payments
   where order_id = p_order_id order by created_at desc limit 1 for update;
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

-- ── Product save (staff) ────────────────────────────────────────────────────
-- Creates or updates a product and replaces its variant list in ONE transaction.
-- SECURITY INVOKER: the caller's RLS policies apply (staff only can write).
-- Quantity edits are captured in the ledger by the variants trigger.
create or replace function public.save_product(p_product jsonb, p_variants jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id      uuid := nullif(p_product ->> 'id', '')::uuid;
  v_variant jsonb;
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
      p_product ->> 'slug',
      p_product ->> 'name',
      (p_product ->> 'brand_id')::uuid,
      nullif(p_product ->> 'category_id', '')::uuid,
      nullif(p_product ->> 'model', ''),
      coalesce(p_product ->> 'description', ''),
      (p_product ->> 'collection')::public.product_collection,
      coalesce(nullif(p_product ->> 'gender', ''), 'unisex')::public.gender,
      (p_product ->> 'condition')::public.condition_grade,
      nullif(p_product ->> 'condition_notes', ''),
      coalesce(p_product -> 'defects', '[]'::jsonb),
      nullif(p_product ->> 'origin_country', ''),
      nullif(p_product ->> 'color', ''),
      (p_product ->> 'price')::numeric,
      nullif(p_product ->> 'compare_at_price', '')::numeric,
      coalesce(nullif(p_product ->> 'status', ''), 'draft')::public.product_status,
      coalesce((p_product ->> 'is_featured')::boolean, false),
      (select auth.uid())
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

  -- Remove variants that were deleted in the editor (past order items keep their snapshot).
  delete from public.product_variants v
   where v.product_id = v_id
     and v.id not in (
       select (e ->> 'id')::uuid from jsonb_array_elements(p_variants) e
        where coalesce(e ->> 'id', '') <> ''
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
        v_id,
        upper(v_variant ->> 'sku'),
        coalesce(nullif(v_variant ->> 'size_system', ''), 'EU')::public.size_system,
        v_variant ->> 'size_value',
        (v_variant ->> 'quantity')::integer,
        nullif(v_variant ->> 'price_override', '')::numeric
      );
    end if;
  end loop;

  -- A listing saved as active with no stock is shown as sold out (and vice versa).
  update public.products p
     set status = case when exists (select 1 from public.product_variants v
                                     where v.product_id = v_id and v.quantity > 0)
                       then 'active'::public.product_status else 'sold_out'::public.product_status end
   where p.id = v_id and p.status in ('active', 'sold_out');

  return v_id;
end;
$$;

-- ── Execute privileges ──────────────────────────────────────────────────────
-- Internal functions: nobody but the owner (and SECURITY DEFINER callers).
revoke execute on all functions in schema private from public, anon, authenticated;

-- App-facing functions: signed-in users only (each checks the role it needs).
revoke execute on function public.adjust_stock(uuid, integer, public.movement_reason, text) from public, anon;
revoke execute on function public.place_order(jsonb, jsonb, jsonb, public.payment_method, text) from public, anon;
revoke execute on function public.cancel_order(uuid, text) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status) from public, anon;
revoke execute on function public.record_payment(uuid, public.payment_status, text, text) from public, anon;
revoke execute on function public.save_product(jsonb, jsonb) from public, anon;

grant execute on function public.adjust_stock(uuid, integer, public.movement_reason, text) to authenticated;
grant execute on function public.place_order(jsonb, jsonb, jsonb, public.payment_method, text) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.record_payment(uuid, public.payment_status, text, text) to authenticated;
grant execute on function public.save_product(jsonb, jsonb) to authenticated;
