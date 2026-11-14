import { useEffect } from 'react'

/**
 * Per-page search-engine tags for this single-page app. Google renders JavaScript,
 * so the title, description, canonical URL, social tags and structured data set here
 * are what it indexes for each page.
 */
export interface SeoOptions {
  /** Page title without the brand; "· Raja Thrifts" is appended. */
  title?: string
  description?: string
  /** Canonical path, e.g. "/shop". Defaults to the current path without the query string. */
  path?: string
  image?: string
  noindex?: boolean
  /** schema.org JSON-LD object(s). */
  jsonLd?: object | object[]
}

const BRAND = 'Raja Thrifts'
export const DEFAULT_TITLE = 'Raja Thrifts — Branded sneakers. Thrift prices.'
export const DEFAULT_DESCRIPTION =
  'Raja Thrifts: branded imported sneakers at thrift prices, honestly graded into Premium, A Category and B Category. Delivered across Pakistan.'

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

function apply(o: SeoOptions) {
  const origin = window.location.origin
  const title = o.title ? `${o.title} · ${BRAND}` : DEFAULT_TITLE
  const description = (o.description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 300)
  const url = origin + (o.path ?? window.location.pathname)
  const image = o.image ? new URL(o.image, origin).href : `${origin}/og-image.jpg`

  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', o.noindex ? 'noindex, nofollow' : null)
  setCanonical(url)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)

  document.getElementById('seo-jsonld')?.remove()
  if (o.jsonLd) {
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.id = 'seo-jsonld'
    s.textContent = JSON.stringify(o.jsonLd)
    document.head.appendChild(s)
  }
}

/** Sets the page's SEO tags; restores the site defaults when the page unmounts. */
export function useSeo(o: SeoOptions | null) {
  const key = JSON.stringify(o)
  useEffect(() => {
    if (!o) return
    apply(o)
    return () => apply({ path: window.location.pathname })
    // `key` captures every field of `o`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
