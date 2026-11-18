/**
 * Cloudflare Pages only (does nothing on Netlify): writes dist/_headers and dist/_routes.json.
 * Netlify keeps using netlify.toml, so the same repo deploys correctly on both hosts.
 */
import { readdirSync, writeFileSync } from 'node:fs'

if (!process.env.CF_PAGES && !process.argv.includes('--force')) process.exit(0)

writeFileSync(
  'dist/_headers',
  [
    '# Keep the preview address (*.pages.dev) out of Google: only rajathrifts.com should be indexed.',
    'https://:project.pages.dev/*',
    '  X-Robots-Tag: noindex',
    '',
    '/dashboard/*',
    '  X-Robots-Tag: noindex, nofollow',
    '',
    '/login',
    '  X-Robots-Tag: noindex, nofollow',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n'),
)

// Functions run ONLY on these paths. Existing build files are excluded so they are served as
// plain static files (free); a missing /assets/ file still reaches the middleware -> real 404.
const include = ['/', '/shop', '/track-order', '/collections/*', '/products/*', '/sitemap.xml']
const assets = readdirSync('dist/assets').map((f) => `/assets/${f}`)
let exclude = []
if (include.length + 1 + assets.length <= 100) {
  include.push('/assets/*')
  exclude = assets
} else {
  console.warn('[cloudflare] too many asset files for _routes.json; skipping the missing-asset 404 rule')
}
writeFileSync('dist/_routes.json', JSON.stringify({ version: 1, include, exclude }, null, 2))
console.log(`[cloudflare] wrote _headers and _routes.json (${include.length} include, ${exclude.length} exclude)`)
