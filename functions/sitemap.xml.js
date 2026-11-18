/**
 * Cloudflare Pages version of netlify/functions/sitemap.mjs: https://rajathrifts.com/sitemap.xml
 * Built live from the active products in Supabase, so new products appear without a redeploy.
 */
import ENV from '../netlify/edge-lib/seo-env.js'
import { buildSitemap } from '../netlify/edge-lib/sitemap-xml.js'
import { SITE_URL } from '../src/lib/seo/copy.ts'

export async function onRequestGet() {
  const cfg = { site: SITE_URL, supabaseUrl: ENV.supabaseUrl, key: ENV.supabaseKey, bucket: ENV.bucket }
  let products = []
  try {
    if (cfg.supabaseUrl && cfg.key) {
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/products?select=slug,updated_at,product_images(storage_path,position)` +
          '&status=eq.active&order=updated_at.desc&limit=5000',
        { headers: { apikey: cfg.key, Accept: 'application/json' } },
      )
      if (!res.ok) throw new Error(`Supabase responded ${res.status}`)
      products = await res.json()
    }
  } catch (e) {
    // Still serve the shop pages so Google never sees a broken sitemap.
    console.error('[sitemap] could not load products:', e)
  }
  return new Response(buildSitemap(cfg, products), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
  })
}
