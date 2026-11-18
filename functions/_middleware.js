/**
 * Cloudflare Pages version of netlify/edge-functions/seo.js (same code, reused as-is).
 * Only runs for the paths listed in dist/_routes.json (see scripts/write-cloudflare.mjs),
 * so normal JS/CSS/image requests never use up function requests.
 */
import seo from '../netlify/edge-functions/seo.js'

const SEO_PATH = /^\/(shop|track-order|collections\/.+|products\/.+)?\/?$/

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url)

  // A build file that no longer exists must be a real 404, not index.html
  // (HTML served as JavaScript stops the app from starting on old iPhone tabs).
  if (url.pathname.startsWith('/assets/')) {
    const res = await ctx.next()
    if ((res.headers.get('content-type') ?? '').includes('text/html')) {
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } })
    }
    return res
  }

  if (ctx.request.method === 'GET' && SEO_PATH.test(url.pathname)) {
    try {
      return await seo(ctx.request, { next: () => ctx.next() })
    } catch (e) {
      console.error('[seo middleware]', e)
    }
  }
  return ctx.next()
}
