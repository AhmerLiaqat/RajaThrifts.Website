-- ════════════════════════════════════════════════════════════════════════════
-- 0014 · Every size has its own EU, UK and US value; the size chart is removed
--
-- Conversions differ between brands, so staff now enter all three sizes for
-- each pair instead of relying on a shared chart:
--   * product_variants gets uk_size and us_size (size_value stays the EU size),
--   * existing sizes are filled in from the chart once, then the chart is dropped,
--   * new or edited sizes must have EU, UK and US values,
--   * order lines are labelled "EU 42 / UK 8 / US 9" from the pair's own sizes.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Columns ─────────────────────────────────────────────────────────────────
alter table public.product_variants
  add column uk_size text check (uk_size ~ '^[0-9]{1,2}(\.5)?$'),
  add column us_size text check (us_size ~ '^[0-9]{1,2}(\.5)?$');

comment on column public.product_variants.size_value is 'EU size';
comment on column public.product_variants.uk_size is 'UK size (required for new or edited sizes)';
comment on column public.product_variants.us_size is 'US size (required for new or edited sizes)';

-- ── One-time backfill from the old chart ────────────────────────────────────
update public.product_variants v
   set uk_size = coalesce(v.uk_size, trim_scale(s.uk)::text),
       us_size = coalesce(v.us_size, trim_scale(coalesce(s.us_men, s.us_women))::text)
  from public.shoe_sizes s
 where v.size_system = 'EU'
   and s.eu = v.size_value::numeric;

-- ── All three sizes required ────────────────────────────────────────────────
-- Checked on insert and when a size changes, so stock updates on older rows
-- (checkout, inventory) never fail. Editing an older pair asks for the missing values.
drop trigger if exists product_variants_validate_size on public.product_variants;

create or replace function private.validate_variant_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.size_value is distinct from old.size_value
     or new.uk_size is distinct from old.uk_size
     or new.us_size is distinct from old.us_size
  then
    if coalesce(new.size_value, '') = '' or coalesce(new.uk_size, '') = '' or coalesce(new.us_size, '') = '' then
      raise exception 'Every size needs an EU, UK and US value' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

create trigger product_variants_validate_size
  before insert or update of size_value, size_system, uk_size, us_size on public.product_variants
  for each row execute function private.validate_variant_size();

-- ── Remove the size chart ───────────────────────────────────────────────────
drop trigger if exists order_items_add_uk_size on public.order_items;
drop function if exists private.order_item_add_uk_size();
drop table if exists public.shoe_sizes;

-- ── Order lines: "EU 42 / UK 8 / US 9" from the pair itself ─────────────────
create or replace function private.order_item_size_label()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uk text;
  v_us text;
begin
  if new.variant_id is not null and new.size_label ~ '^EU [0-9]{1,2}(\.5)?$' then
    select v.uk_size, v.us_size into v_uk, v_us from public.product_variants v where v.id = new.variant_id;
    new.size_label := new.size_label
      || coalesce(' / UK ' || v_uk, '')
      || coalesce(' / US ' || v_us, '');
  end if;
  return new;
end;
$$;

revoke all on function private.order_item_size_label() from public;

create trigger order_items_size_label
  before insert on public.order_items
  for each row execute function private.order_item_size_label();

-- ── save_product: also stores uk_size / us_size ─────────────────────────────
-- Same as 0006, plus the two size columns. Grants on the function are kept.
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
        uk_size        = nullif(trim(v_variant ->> 'uk_size'), ''),
        us_size        = nullif(trim(v_variant ->> 'us_size'), ''),
        quantity       = (v_variant ->> 'quantity')::integer,
        price_override = nullif(v_variant ->> 'price_override', '')::numeric
      where id = (v_variant ->> 'id')::uuid and product_id = v_id;
      if not found then
        raise exception 'Variant does not belong to this product' using errcode = '22023';
      end if;
    else
      insert into public.product_variants (
        product_id, sku, size_system, size_value, uk_size, us_size, quantity, price_override
      )
      values (
        v_id, upper(v_variant ->> 'sku'),
        coalesce(nullif(v_variant ->> 'size_system', ''), 'EU')::public.size_system,
        v_variant ->> 'size_value',
        nullif(trim(v_variant ->> 'uk_size'), ''), nullif(trim(v_variant ->> 'us_size'), ''),
        (v_variant ->> 'quantity')::integer,
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
