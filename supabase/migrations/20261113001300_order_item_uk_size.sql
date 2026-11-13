-- ════════════════════════════════════════════════════════════════════════════
-- 0013 · Order lines show the UK size next to the EU size
--
-- Checkout snapshots each line's size as "EU 42". The storefront now shows
-- EU and UK together, so new order lines are stored as "EU 42 / UK 8" using the
-- size chart at the time of the order. That label flows unchanged to order
-- confirmation, tracking, the account page, returns and WhatsApp messages.
-- Lines for sizes without a UK value in the chart keep "EU 42".
-- Existing orders are left as they were (they are a historical snapshot).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.order_item_add_uk_size()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eu numeric;
  v_uk numeric;
begin
  if new.size_label ~ '^EU [0-9]{1,2}(\.[05])?$' then
    v_eu := substring(new.size_label from 4)::numeric;
    select s.uk into v_uk from public.shoe_sizes s where s.eu = v_eu;
    if v_uk is not null then
      new.size_label := new.size_label || ' / UK ' || trim_scale(v_uk)::text;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.order_item_add_uk_size() from public;

create trigger order_items_add_uk_size
  before insert on public.order_items
  for each row execute function private.order_item_add_uk_size();
