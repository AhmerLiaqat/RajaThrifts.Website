-- ════════════════════════════════════════════════════════════════════════════
-- 0009 · Advance bank-transfer checkout, payment screenshots, WhatsApp links, reviews
--
-- 1. store_settings gets the shop's bank account + WhatsApp details. These are
--    meant to be public (customers see them at checkout), and settings are
--    already publicly readable / admin-writable.
-- 2. orders.payment_proof_path + a PRIVATE storage bucket for transfer
--    screenshots. Customers upload into their own folder ({user_id}/…); only
--    they and staff can read them.
-- 3. place_order_with_proof(): the checkout used by the storefront. Same rules
--    as place_order() (prices, stock and totals computed server-side) but it is
--    always an advance bank transfer and the screenshot is attached atomically.
-- 4. set_payment_proof(): the customer can re-upload while the order is pending.
-- 5. reviews: testimonials the shop copies in from WhatsApp, published on the
--    homepage. Staff manage them; the public only sees published ones.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Store settings ───────────────────────────────────────────────────────
alter table public.store_settings
  add column bank_name           text check (char_length(bank_name) <= 80),
  add column bank_account_title  text check (char_length(bank_account_title) <= 120),
  add column bank_account_number text check (char_length(bank_account_number) <= 40),
  add column bank_iban           text check (char_length(bank_iban) <= 40),
  add column payment_instructions text check (char_length(payment_instructions) <= 500),
  -- International format without "+" or spaces, e.g. 923001234567 (used for wa.me links).
  add column whatsapp_number     text check (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  add column whatsapp_group_url  text check (whatsapp_group_url ~ '^https://(chat\.whatsapp\.com|wa\.me|whatsapp\.com)/');

-- ── 2. Payment screenshots ──────────────────────────────────────────────────
alter table public.orders
  add column payment_proof_path        text check (char_length(payment_proof_path) <= 200),
  add column payment_proof_uploaded_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Customers write only inside their own folder; nobody but staff can delete.
create policy "payment-proofs: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "payment-proofs: owner or staff read" on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (split_part(name, '/', 1) = (select auth.uid())::text or (select public.is_staff()))
  );
create policy "payment-proofs: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-proofs' and (select public.is_staff()));

-- Validates a proof path for the current user: own folder, sane name, file really uploaded.
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
     or p_path !~ ('^' || v_user::text || '/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$') then
    raise exception 'Please attach a screenshot of your bank transfer' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_path) then
    raise exception 'The payment screenshot did not upload. Please try again.' using errcode = '22023';
  end if;
end;
$$;

-- ── 3. Checkout with advance payment ────────────────────────────────────────
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
  if (select auth.uid()) is null then
    raise exception 'Please sign in to place an order' using errcode = '42501';
  end if;
  perform private.assert_payment_proof(p_payment_proof);

  v_order := public.place_order(p_items, p_contact, p_address, 'bank_transfer', p_customer_notes);

  update public.orders
     set payment_proof_path = p_payment_proof,
         payment_proof_uploaded_at = now()
   where id = v_order.id
  returning * into v_order;
  return v_order;
end;
$$;

-- ── 4. Replace the screenshot while the order is still pending ──────────────
create or replace function public.set_payment_proof(p_order_id uuid, p_payment_proof text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id is distinct from (select auth.uid()) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' or v_order.payment_status <> 'pending' then
    raise exception 'This order is already being processed. Please contact us on WhatsApp.'
      using errcode = '22023';
  end if;
  perform private.assert_payment_proof(p_payment_proof);

  update public.orders
     set payment_proof_path = p_payment_proof,
         payment_proof_uploaded_at = now()
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

revoke execute on function private.assert_payment_proof(text) from public, anon, authenticated;
revoke execute on function public.place_order_with_proof(jsonb, jsonb, jsonb, text, text) from public, anon;
revoke execute on function public.set_payment_proof(uuid, text) from public, anon;
grant execute on function public.place_order_with_proof(jsonb, jsonb, jsonb, text, text) to authenticated;
grant execute on function public.set_payment_proof(uuid, text) to authenticated;

-- ── 5. Reviews (copied in from WhatsApp etc.) ───────────────────────────────
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 80),
  city          text check (char_length(city) <= 80),
  rating        smallint not null default 5 check (rating between 1 and 5),
  body          text not null check (char_length(trim(body)) between 3 and 600),
  source        text not null default 'whatsapp'
                check (source in ('whatsapp', 'instagram', 'facebook', 'in_person', 'other')),
  -- Optional screenshot in the public product-images bucket (reviews/…). Crop out phone numbers.
  image_path    text check (char_length(image_path) <= 200),
  review_date   date not null default current_date,
  published     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid()
);

create index reviews_published_idx on public.reviews (published, sort_order, review_date desc);

create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function private.set_updated_at();

alter table public.reviews enable row level security;
create policy "reviews: public read published" on public.reviews for select to anon, authenticated
  using (published or (select public.is_staff()));
create policy "reviews: staff insert" on public.reviews for insert to authenticated
  with check ((select public.is_staff()));
create policy "reviews: staff update" on public.reviews for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "reviews: staff delete" on public.reviews for delete to authenticated
  using ((select public.is_staff()));
