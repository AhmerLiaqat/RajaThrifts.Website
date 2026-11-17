/**
 * Server-side page content for search engines. The app (React) replaces it as soon as it
 * loads, so visitors see the normal site; crawlers get real text and links in the first
 * HTML response instead of an empty <div id="root">. Content mirrors what the app shows.
 */
import { COLLECTION_SEO, CONTACT_INFO, FAQS } from '../../src/lib/seo/copy.ts'

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pkr = (n) => `Rs ${Math.round(n).toLocaleString('en-US')}`
const COLLECTION_SLUG = { PREMIUM: 'premium', 'A CATEGORY': 'a-category', 'B CATEGORY': 'b-category' }

const STYLE =
  '<style>.seo-fallback{max-width:1100px;margin:0 auto;padding:24px 16px;font-family:Inter,system-ui,sans-serif;color:#111a33;line-height:1.6}' +
  '.seo-fallback a{color:#24358a}.seo-fallback ul{padding-left:18px}.seo-fallback img{max-width:220px;height:auto;border-radius:12px}</style>'

const nav = () =>
  `<nav aria-label="Main"><a href="/">Raja Thrifts</a> · <a href="/shop">Shop all</a> · ` +
  Object.entries(COLLECTION_SEO)
    .map(([slug, c]) => `<a href="/collections/${slug}">${esc(c.name)}</a>`)
    .join(' · ') +
  ' · <a href="/track-order">Track order</a></nav>'

const footer = () =>
  `<footer><p>WhatsApp: ${CONTACT_INFO.whatsapp.map(esc).join(', ')} · Calls: ${esc(CONTACT_INFO.phone)} · ` +
  `<a href="${CONTACT_INFO.instagram}">Instagram</a> · <a href="${CONTACT_INFO.tiktok}">TikTok</a></p>` +
  '<p>Raja Thrifts: imported branded thrift sneakers, delivered across Pakistan.</p></footer>'

function productList(products) {
  if (!products?.length) return ''
  return (
    '<ul>' +
    products
      .map(
        (p) =>
          `<li><a href="/products/${encodeURIComponent(p.slug)}">${esc(p.brand)} ${esc(p.name)}</a>` +
          `${p.sizes?.length ? `, size ${esc(p.sizes.join('/'))}` : ''}, ${esc(pkr(p.price))}</li>`,
      )
      .join('') +
    '</ul>'
  )
}

/** Listing pages (home, shop, collections, track). */
export function listingBody(seo, { heading, intro, products = [], faqs = false }) {
  return (
    `${STYLE}<div class="seo-fallback">${nav()}<main><h1>${esc(heading)}</h1><p>${esc(intro || seo.description)}</p>` +
    (products.length ? `<h2>Pairs in stock</h2>${productList(products)}` : '') +
    (faqs
      ? '<h2>Frequently asked questions</h2>' + FAQS.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')
      : '') +
    `</main>${footer()}</div>`
  )
}

/** A product page. */
export function productBody(p, seo) {
  const slug = COLLECTION_SLUG[p.collection]
  const grade = COLLECTION_SEO[slug]
  return (
    `${STYLE}<div class="seo-fallback">${nav()}<main>` +
    `<p><a href="/">Home</a> › <a href="/shop">Shop</a> › <a href="/collections/${slug}">${esc(grade.name)} sneakers</a></p>` +
    `<h1>${esc(p.brand)} ${esc(p.name)}</h1>` +
    `<p><strong>${esc(pkr(p.price))}</strong>${p.compareAtPrice ? ` <s>${esc(pkr(p.compareAtPrice))}</s>` : ''} · ` +
    `${p.inStock ? 'In stock' : 'Sold out'}</p>` +
    '<ul>' +
    `<li>Brand: ${esc(p.brand)}</li>` +
    (p.sizes.length ? `<li>Size: EU ${esc(p.sizes.join(', '))}</li>` : '') +
    `<li>Grade: ${esc(grade.name)}</li><li>Condition: ${esc(p.conditionLabel)}</li>` +
    (p.color ? `<li>Colour: ${esc(p.color)}</li>` : '') +
    '<li>Delivery: all over Pakistan</li></ul>' +
    `<p>${esc(p.description || seo.description)}</p>` +
    p.images.slice(0, 4).map((src, i) => `<img src="${esc(src)}" alt="${esc(`${p.brand} ${p.name}, photo ${i + 1}`)}" loading="lazy" />`).join(' ') +
    `<p>${esc(grade.intro)}</p>` +
    `</main>${footer()}</div>`
  )
}

/** Replaces the empty app container with the fallback content. */
export function injectBody(html, body) {
  return html.replace(/<div id="root"><\/div>/, `<div id="root">${body}</div>`)
}
