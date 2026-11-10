-- ════════════════════════════════════════════════════════════════════════════
-- 0011 · Admin approval for advance-payment orders
--
-- Bank-transfer orders stay PENDING until an admin has checked the bank account:
--   • Only an admin can mark a bank-transfer payment as paid.
--   • A bank-transfer order can only be confirmed once its payment is paid,
--     and only by an admin.
--   • approve_order(): admin verifies the transfer → payment paid + order
--     confirmed, in one step.
--   • reject_order(): admin rejects (e.g. money never arrived) → order cancelled,
--     pairs back on sale, reason saved for the record.
-- Enforced by a trigger, so it holds however the order is updated.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function private.guard_advance_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Server-side maintenance (no signed-in user) is not restricted.
  if new.payment_method <> 'bank_transfer' or (select auth.uid()) is null then
    return new;
  end if;

  if new.payment_status = 'paid' and old.payment_status <> 'paid' and not public.is_admin() then
    raise exception 'Only an admin can verify a bank transfer' using errcode = '42501';
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    if not public.is_admin() then
      raise exception 'Only an admin can approve an advance-payment order' using errcode = '42501';
    end if;
    if new.payment_status <> 'paid' then
      raise exception 'Verify the payment before approving this order' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_guard_advance_payment
  before update of status, payment_status on public.orders
  for each row execute function private.guard_advance_payment();

-- ── Approve: payment verified + order confirmed ─────────────────────────────
create or replace function public.approve_order(p_order_id uuid, p_reference text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can approve orders' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be approved (this one is %)', v_order.status using errcode = '22023';
  end if;

  if v_order.payment_status <> 'paid' then
    perform public.record_payment(p_order_id, 'paid', p_reference, 'Bank transfer verified by admin');
  end if;
  return public.update_order_status(p_order_id, 'confirmed');
end;
$$;

-- ── Reject: cancel, restock, keep the reason ────────────────────────────────
create or replace function public.reject_order(p_order_id uuid, p_reason text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order  public.orders;
  v_reason text := nullif(left(trim(p_reason), 300), '');
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reject orders' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Give a reason for rejecting the order' using errcode = '22023';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be rejected (this one is %)', v_order.status using errcode = '22023';
  end if;

  perform public.cancel_order(p_order_id, 'Rejected: ' || v_reason);
  update public.payments set status = 'failed', notes = 'Rejected: ' || v_reason
   where order_id = p_order_id and status = 'pending';
  update public.orders
     set payment_status = case when payment_status = 'pending' then 'failed' else payment_status end,
         staff_notes = concat_ws(E'\n', staff_notes, 'Rejected: ' || v_reason)
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

revoke execute on function private.guard_advance_payment() from public, anon, authenticated;
revoke execute on function public.approve_order(uuid, text) from public, anon;
revoke execute on function public.reject_order(uuid, text) from public, anon;
grant execute on function public.approve_order(uuid, text) to authenticated;
grant execute on function public.reject_order(uuid, text) to authenticated;
