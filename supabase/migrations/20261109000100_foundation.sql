-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0001 · Foundation: extensions, private schema, enums, helpers
-- ════════════════════════════════════════════════════════════════════════════
-- Money: all PKR amounts are numeric(12,2) (exact decimal rupees, max 9,999,999,999.99).
-- The frontend converts to integer paisa (minor units) in the service-layer mappers.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Internal helpers live in `private`, which is NOT exposed through the Data API (PostgREST).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ── Enums ───────────────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'shopkeeper', 'admin');

-- The three collections. Values must match src/constants/collections.ts exactly.
create type public.product_collection as enum ('PREMIUM', 'A CATEGORY', 'B CATEGORY');

create type public.product_status  as enum ('draft', 'active', 'sold_out', 'archived');
create type public.condition_grade as enum ('like_new', 'excellent', 'good', 'fair');
create type public.gender          as enum ('men', 'women', 'unisex', 'kids');
create type public.size_system     as enum ('EU', 'UK', 'US');
create type public.image_view      as enum ('front', 'side', 'back', 'sole', 'top', 'detail', 'on_foot');
create type public.movement_reason as enum ('intake', 'sale', 'return', 'adjustment', 'damaged', 'released');

create type public.order_status   as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_method as enum ('cod', 'bank_transfer', 'easypaisa', 'jazzcash', 'card');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- ── Shared trigger: keep updated_at current ─────────────────────────────────
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
