-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0007 · "returned" order status (courier return to sender / RTO)
-- ════════════════════════════════════════════════════════════════════════════
-- A COD parcel the customer refused, or the courier could not deliver, comes back
-- to the shop. It was never delivered, so it never becomes revenue.
-- Kept in its own migration: Postgres cannot use a new enum value inside the
-- same transaction that adds it.

alter type public.order_status add value if not exists 'returned' after 'delivered';
