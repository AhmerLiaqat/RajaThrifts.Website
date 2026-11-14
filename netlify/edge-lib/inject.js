/**
 * Writes page-specific SEO tags into the HTML shell (pure string work, so it runs on
 * Netlify's edge and in Node tests alike).
 */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function setTag(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`)
}

/** @param {string} html @param {import('../../src/lib/seo/copy.ts').PageSeo} seo @param {string} origin */
export function injectSeo(html, seo, origin) {
  const url = origin + seo.path
  const image = seo.image ? new URL(seo.image, origin).href : `${origin}/og-image.jpg`
  const meta = (attr, key, content) => [
    new RegExp(`<meta\\s+${attr}="${key.replace(/[.:]/g, '\\$&')}"[^>]*>`, 'i'),
    `<meta ${attr}="${key}" content="${esc(content)}" />`,
  ]
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(seo.title)}</title>`)
  const tags = [
    meta('name', 'description', seo.description),
    meta('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'),
    ...(seo.keywords?.length ? [meta('name', 'keywords', seo.keywords.join(', '))] : []),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:type', seo.path.startsWith('/products/') ? 'product' : 'website'),
    meta('name', 'twitter:title', seo.title),
    meta('name', 'twitter:description', seo.description),
    meta('name', 'twitter:image', image),
    [/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(url)}" />`],
  ]
  for (const [pattern, tag] of tags) out = setTag(out, pattern, tag)
  if (seo.jsonLd?.length) {
    // The app replaces this script (same id) once it has loaded.
    const json = JSON.stringify(seo.jsonLd.length === 1 ? seo.jsonLd[0] : seo.jsonLd).replace(/</g, '\\u003c')
    out = out.replace('</head>', `    <script type="application/ld+json" id="seo-jsonld">${json}</script>\n  </head>`)
  }
  return out
}
