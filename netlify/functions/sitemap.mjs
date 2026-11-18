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
import { buildSitemap } from '../edge-lib/sitemap-xml.js'

function readEnvFile() {
  // Netlify may bundle this file as CommonJS, where import.meta.url is undefined: never let that crash.
  let here = process.cwd()
  try {
    // eslint-disable-next-line no-undef
    if (typeof __dirname === 'string') here = __dirname
    else if (import.meta && import.meta.url) here = path.dirname(fileURLToPath(import.meta.url))
  } catch {
    // keep process.cwd()
  }
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

export const handler = async (event) => {
  let cfg = { site: 'https://rajathrifts.com', supabaseUrl: '', key: '', bucket: 'product-images' }
  let products = []
  try {
    cfg = config(event)
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
