-- ════════════════════════════════════════════════════════════════════════════
-- 0015 · Optional size in centimetres (foot / insole length) per pair
--
--   * product_variants.cm_size: optional, e.g. 26.5 (10–40 cm, one decimal),
--   * order lines append it when set: "EU 42 / UK 8 / US 9 / 26.5 cm",
--   * save_product stores it.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.product_variants
  add column cm_size text check (
    cm_size is null or case when cm_size ~ '^[0-9]{1,2}(\.[0-9])?$' then cm_size::numeric between 10 and 40 else false end
  );

comment on column public.product_variants.cm_size is 'Optional foot / insole length in cm';

-- ── Order lines: add the cm size when the pair has one ──────────────────────
create or replace function private.order_item_size_label()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uk text;
  v_us text;
  v_cm text;
begin
  if new.variant_id is not null and new.size_label ~ '^EU [0-9]{1,2}(\.5)?$' then
    select v.uk_size, v.us_size, v.cm_size into v_uk, v_us, v_cm
      from public.product_variants v where v.id = new.variant_id;
    new.size_label := new.size_label
      || coalesce(' / UK ' || v_uk, '')
      || coalesce(' / US ' || v_us, '')
      || coalesce(' / ' || v_cm || ' cm', '');
  end if;
  return new;
end;
$$;

-- ── save_product: also stores cm_size ───────────────────────────────────────
-- Same as 0014, plus cm_size. Grants on the function are kept.
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
        cm_size        = nullif(trim(v_variant ->> 'cm_size'), ''),
        quantity       = (v_variant ->> 'quantity')::integer,
        price_override = nullif(v_variant ->> 'price_override', '')::numeric
      where id = (v_variant ->> 'id')::uuid and product_id = v_id;
      if not found then
        raise exception 'Variant does not belong to this product' using errcode = '22023';
      end if;
    else
      insert into public.product_variants (
        product_id, sku, size_system, size_value, uk_size, us_size, cm_size, quantity, price_override
      )
      values (
        v_id, upper(v_variant ->> 'sku'),
        coalesce(nullif(v_variant ->> 'size_system', ''), 'EU')::public.size_system,
        v_variant ->> 'size_value',
        nullif(trim(v_variant ->> 'uk_size'), ''), nullif(trim(v_variant ->> 'us_size'), ''),
        nullif(trim(v_variant ->> 'cm_size'), ''),
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
