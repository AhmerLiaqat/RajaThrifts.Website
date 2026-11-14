-- ════════════════════════════════════════════════════════════════════════════
-- 0016 · Hiking and Sports shoe categories
--
-- Adds two shoe types staff can pick in the product editor; customers can shop
-- them from the main menu (/shop?type=hiking, /shop?type=sports) and the
-- "Shoe type" filter. Safe to re-run: existing categories are left untouched.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.categories (name, slug, sort_order) values
  ('Hiking', 'hiking', 8),
  ('Sports', 'sports', 9)
on conflict do nothing;
