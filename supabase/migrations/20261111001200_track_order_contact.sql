-- ════════════════════════════════════════════════════════════════════════════
-- 0012 · Order tracking shows the delivery details
--
-- Customers track an order with its number + the phone used at checkout.
-- They already know that phone, so returning the name, phone and delivery
-- address they entered is safe, and lets them check the address is right.
-- Same checks as before (phone must match); only the returned fields change.
-- ════════════════════════════════════════════════════════════════════════════

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
    'contact_phone', v_order.contact_phone,
    'shipping_address_line1', v_order.shipping_address_line1,
    'shipping_address_line2', v_order.shipping_address_line2,
    'shipping_city', v_order.shipping_city,
    'shipping_province', v_order.shipping_province,
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
