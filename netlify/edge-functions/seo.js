/**
 * SEO edge function: puts the right <title>, description, canonical, social preview tags
 * and structured data into the HTML of public pages BEFORE JavaScript runs. Google, Bing,
 * WhatsApp and Facebook all read these. Any failure falls back to the normal page.
 */
import { COLLECTION_SEO, CONDITION_LABELS, productSeo, SITE_URL, staticPageSeo } from '../../src/lib/seo/copy.ts'
import { injectBody, listingBody, productBody } from '../edge-lib/body.js'
import { injectSeo } from '../edge-lib/inject.js'
import ENV from '../edge-lib/seo-env.js'

const SELECT =
  'slug,name,description,price,compare_at_price,collection,condition,color,status,created_at,' +
  'brand:brands(name),product_images(storage_path,position),product_variants(size_value,quantity,sku)'

function mapRow(row) {
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

async function query(params) {
  // Throws on any failure so callers never mistake "Supabase is down" for "no such product".
  if (!ENV.supabaseUrl || !ENV.supabaseKey) throw new Error('Supabase env missing')
  const res = await fetch(`${ENV.supabaseUrl}/rest/v1/products?select=${SELECT}&${params}`, {
    headers: { apikey: ENV.supabaseKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(2500),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  return res.json()
}

async function loadProduct(slug) {
  const [row] = await query(`slug=eq.${encodeURIComponent(slug)}&limit=1`)
  if (!row || (row.status !== 'active' && row.status !== 'sold_out')) return null
  return mapRow(row)
}

async function loadListing(collection) {
  const filter = collection ? `&collection=eq.${encodeURIComponent(collection)}` : ''
  const rows = await query(`status=eq.active${filter}&order=created_at.desc&limit=60`)
  return rows.map(mapRow).filter((p) => p.inStock)
}

const GRADE_BY_SLUG = { premium: 'PREMIUM', 'a-category': 'A CATEGORY', 'b-category': 'B CATEGORY' }

/** Page content for crawlers: headings, text and links to every pair in stock. */
async function bodyFor(pathname, seo) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') {
    return listingBody(seo, {
      heading: 'Raja Thrifts: thrifted shoes in Pakistan, branded sneakers at thrift prices',
      intro:
        "Raja Thrifts is Pakistan's online thrift store for thrifted shoes and imported branded sneakers (landa shoes): " +
        'Nike, Adidas, New Balance and more, graded by hand into Premium, A Category and B Category. ' +
        'Delivered to Islamabad, Rawalpindi, Lahore, Karachi, Peshawar, Faisalabad, Multan and all over Pakistan.',
      products: await loadListing(),
      faqs: true,
    })
  }
  if (path === '/shop') {
    return listingBody(seo, { heading: 'Shop thrift shoes online: branded thrifted sneakers', products: await loadListing() })
  }
  const m = path.match(/^\/collections\/([a-z-]+)$/)
  if (m && COLLECTION_SEO[m[1]]) {
    const c = COLLECTION_SEO[m[1]]
    return listingBody(seo, { heading: `${c.name} thrifted shoes and sneakers`, intro: `${c.intro} ${c.description}`, products: await loadListing(GRADE_BY_SLUG[m[1]]) })
  }
  if (path === '/track-order') return listingBody(seo, { heading: 'Track your order' })
  return null
}

export default async (request, context) => {
  const res = await context.next()
  try {
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res
    const url = new URL(request.url)
    const origin = url.hostname.endsWith('rajathrifts.com') ? SITE_URL : url.origin
    let seo = staticPageSeo(url.pathname, origin)
    let body = null
    const m = url.pathname.match(/^\/products\/([^/]+)\/?$/)
    if (m) {
      const product = await loadProduct(decodeURIComponent(m[1]))
      if (!product) {
        // Deleted/unknown product: keep it out of the index instead of letting it look like the homepage.
        const headers = new Headers(res.headers)
        headers.set('X-Robots-Tag', 'noindex')
        return new Response(res.body, { status: res.status, headers })
      }
      seo = productSeo(product, origin)
      body = productBody(product, seo)
    } else if (seo) {
      body = await bodyFor(url.pathname, seo).catch(() => null)
    }
    if (!seo) return res
    let html = injectSeo(await res.text(), seo, origin)
    if (body) html = injectBody(html, body)
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
