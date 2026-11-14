// Overwritten during "npm run build" by scripts/write-edge-env.mjs with the public Supabase
// URL + publishable key from .env.production. Empty values just skip product lookups.
export default { supabaseUrl: '', supabaseKey: '', bucket: 'product-images' }
