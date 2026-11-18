/**
 * Builds the sitemap XML (pure string work). Shared by the Netlify function
 * (netlify/functions/sitemap.mjs) and the Cloudflare Pages function (functions/sitemap.xml.js).
 */
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/collections/premium', priority: '0.8', changefreq: 'daily' },
  { path: '/collections/a-category', priority: '0.8', changefreq: 'daily' },
  { path: '/collections/b-category', priority: '0.8', changefreq: 'daily' },
  { path: '/reviews', priority: '0.5', changefreq: 'weekly' },
  { path: '/track-order', priority: '0.3', changefreq: 'monthly' },
]

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

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
