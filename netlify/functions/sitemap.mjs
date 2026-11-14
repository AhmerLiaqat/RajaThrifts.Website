/**
 * Live sitemap for Google: https://<site>/sitemap.xml
 *
 * Built on every request (cached for an hour), so new products appear without a redeploy.
 * Lists the shop pages plus every ACTIVE product, with its photos (image sitemap).
 * Reads the public Supabase URL + publishable key from Netlify environment variables,
 * or from .env.production (bundled with this function, see netlify.toml).
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/collections/premium', priority: '0.8', changefreq: 'daily' },
  { path: '/collections/a-category', priority: '0.8', changefreq: 'daily' },
  { path: '/collections/b-category', priority: '0.8', changefreq: 'daily' },
  { path: '/track-order', priority: '0.3', changefreq: 'monthly' },
]

function readEnvFile() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(process.cwd(), '.env.production'),
    path.join(process.env.LAMBDA_TASK_ROOT ?? '', '.env.production'),
    path.join(here, '.env.production'),
    path.join(here, '..', '.env.production'),
    path.join(here, '..', '..', '.env.production'),
  ]
  for (const file of candidates) {
    try {
      const out = {}
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
        if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
      return out
    } catch {
      // try the next location
    }
  }
  return {}
}

function config(event) {
  const file = readEnvFile()
  const get = (k) => process.env[k] || file[k] || ''
  const host = event?.headers?.host
  // VITE_APP_URL (https://rajathrifts.com) wins, so every link uses the one official domain.
  const site = (get('VITE_APP_URL') || process.env.URL || (host ? `https://${host}` : 'https://rajathrifts.com')).replace(/\/+$/, '')
  return {
    site,
    supabaseUrl: get('VITE_SUPABASE_URL').replace(/\/+$/, ''),
    key: get('VITE_SUPABASE_ANON_KEY'),
    bucket: get('VITE_PRODUCT_IMAGES_BUCKET') || 'product-images',
  }
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

async function fetchProducts({ supabaseUrl, key }) {
  if (!supabaseUrl || !key) return []
  const url =
    `${supabaseUrl}/rest/v1/products` +
    '?select=slug,updated_at,product_images(storage_path,position)' +
    '&status=eq.active&order=updated_at.desc&limit=5000'
  const res = await fetch(url, { headers: { apikey: key, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`)
  return res.json()
}

export function buildSitemap(cfg, products) {
  const newest = products[0]?.updated_at
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ]
  for (const p of STATIC_PAGES) {
    lines.push(
      '  <url>',
      `    <loc>${esc(cfg.site + p.path)}</loc>`,
      ...(newest && p.changefreq === 'daily' ? [`    <lastmod>${esc(newest.slice(0, 10))}</lastmod>`] : []),
      `    <changefreq>${p.changefreq}</changefreq>`,
      `    <priority>${p.priority}</priority>`,
      '  </url>',
    )
  }
  for (const p of products) {
    if (!p?.slug) continue
    const images = [...(p.product_images ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).slice(0, 10)
    lines.push(
      '  <url>',
      `    <loc>${esc(`${cfg.site}/products/${encodeURIComponent(p.slug)}`)}</loc>`,
      ...(p.updated_at ? [`    <lastmod>${esc(p.updated_at.slice(0, 10))}</lastmod>`] : []),
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.7</priority>',
      ...images.map(
        (i) =>
          `    <image:image><image:loc>${esc(
            `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.bucket}/${i.storage_path}`,
          )}</image:loc></image:image>`,
      ),
      '  </url>',
    )
  }
  lines.push('</urlset>')
  return lines.join('\n')
}

export const handler = async (event) => {
  const cfg = config(event)
  let products = []
  try {
    products = await fetchProducts(cfg)
  } catch (e) {
    // Still serve the shop pages so Google never sees a broken sitemap.
    console.error('[sitemap] could not load products:', e)
  }
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
    body: buildSitemap(cfg, products),
  }
}
