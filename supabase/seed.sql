-- RajaThrifs seed data: reference tables only (categories, brands).
-- Safe to re-run. Products are created by staff in /admin/products.
-- Apply with `npx supabase db reset` (local) or paste into the SQL editor.

insert into public.categories (name, slug, sort_order) values
  ('Sneakers',          'sneakers',   1),
  ('Running',           'running',    2),
  ('Basketball',        'basketball', 3),
  ('Boots',             'boots',      4),
  ('Formal',            'formal',     5),
  ('Loafers',           'loafers',    6),
  ('Sandals & Slides',  'sandals',    7),
  ('Other',             'other',      99)
on conflict (slug) do nothing;

insert into public.brands (name, slug) values
  ('Nike', 'nike'), ('Adidas', 'adidas'), ('New Balance', 'new-balance'), ('Converse', 'converse'),
  ('Vans', 'vans'), ('Puma', 'puma'), ('Reebok', 'reebok'), ('ASICS', 'asics'),
  ('Skechers', 'skechers'), ('Timberland', 'timberland'), ('Clarks', 'clarks'), ('Dr. Martens', 'dr-martens')
on conflict (slug) do nothing;
