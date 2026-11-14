/**
 * SEO edge function: puts the right <title>, description, canonical, social preview tags
 * and structured data into the HTML of public pages BEFORE JavaScript runs. Google, Bing,
 * WhatsApp and Facebook all read these. Any failure falls back to the normal page.
 */
import { CONDITION_LABELS, productSeo, SITE_URL, staticPageSeo } from '../../src/lib/seo/copy.ts'
import { injectSeo } from '../edge-lib/inject.js'
import ENV from '../edge-lib/seo-env.js'

async function loadProduct(slug) {
  if (!ENV.supabaseUrl || !ENV.supabaseKey) return null
  const select =
    'slug,name,description,price,compare_at_price,collection,condition,color,status,' +
    'brand:brands(name),product_images(storage_path,position),product_variants(size_value,quantity,sku)'
  const res = await fetch(
    `${ENV.supabaseUrl}/rest/v1/products?select=${select}&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { headers: { apikey: ENV.supabaseKey, Accept: 'application/json' }, signal: AbortSignal.timeout(2500) },
  )
  if (!res.ok) return null
  const [row] = await res.json()
  if (!row || (row.status !== 'active' && row.status !== 'sold_out')) return null
  const variants = row.product_variants ?? []
  const inStock = variants.filter((v) => v.quantity > 0)
  const images = [...(row.product_images ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((i) => `${ENV.supabaseUrl}/storage/v1/object/public/${ENV.bucket}/${i.storage_path}`)
  return {
    slug: row.slug,
    brand: row.brand?.name ?? '',
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    collection: row.collection,
    conditionLabel: CONDITION_LABELS[row.condition] ?? 'Good',
    color: row.color,
    sizes: (inStock.length ? inStock : variants).map((v) => v.size_value),
    images,
    sku: variants[0]?.sku ?? null,
    inStock: inStock.length > 0 && row.status === 'active',
  }
}

export default async (request, context) => {
  const res = await context.next()
  try {
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res
    const url = new URL(request.url)
    const origin = url.hostname.endsWith('rajathrifts.com') ? SITE_URL : url.origin
    let seo = staticPageSeo(url.pathname, origin)
    const m = url.pathname.match(/^\/products\/([^/]+)\/?$/)
    if (m) {
      const product = await loadProduct(decodeURIComponent(m[1]))
      seo = product ? productSeo(product, origin) : null
    }
    if (!seo) return res
    const html = injectSeo(await res.text(), seo, origin)
    const headers = new Headers(res.headers)
    headers.delete('content-length')
    return new Response(html, { status: res.status, headers })
  } catch (e) {
    console.error('[seo edge]', e)
    return res
  }
}

export const config = {
  path: ['/', '/shop', '/collections/*', '/products/*', '/track-order'],
  onError: 'bypass',
}
