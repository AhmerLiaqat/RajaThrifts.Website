/**
 * Raja Thrifts SEO copy: titles, descriptions, keywords, FAQs and schema.org data.
 *
 * ONE source of truth, used by the React app (src/lib/seo/useSeo.ts) and by the Netlify
 * edge function that writes the same tags into the HTML before JavaScript runs
 * (netlify/edge-functions/seo.js). Keep this file free of "@/" imports and React so the
 * edge bundler can load it directly.
 *
 * Writing rules: titles ≤ ~60 characters, descriptions ≤ ~155, main keyword first,
 * brand last. Only state facts that are true for the shop.
 */

export const SITE_NAME = 'Raja Thrifts'
export const SITE_URL = 'https://rajathrifts.com'

export const CONTACT_INFO = {
  whatsapp: ['+923249557634', '+923018457870'],
  phone: '+923105318980',
  instagram: 'https://www.instagram.com/rajathrifts',
  tiktok: 'https://www.tiktok.com/@rajathrifts',
}

/** Search phrases the site is written around (Pakistan, branded thrift / pre-owned sneakers). */
export const KEYWORDS = [
  'thrift shoes Pakistan',
  'branded shoes Pakistan',
  'imported shoes Pakistan',
  'thrift sneakers',
  'used branded sneakers',
  'preloved sneakers Pakistan',
  'second hand branded shoes',
  'branded sneakers price in Pakistan',
  'Nike shoes Pakistan',
  'Adidas shoes Pakistan',
  'New Balance shoes Pakistan',
  'cheap branded sneakers Pakistan',
  'online shoe store Pakistan',
  'Raja Thrifts',
]

export interface PageSeo {
  /** Full <title> (already includes the brand). */
  title: string
  description: string
  /** Canonical path, e.g. "/shop". */
  path: string
  keywords?: string[]
  image?: string
  noindex?: boolean
  jsonLd?: object[]
}

type CollectionSlug = 'premium' | 'a-category' | 'b-category'

/** Condition labels (mirrors src/constants/product.ts) for the edge function. */
export const CONDITION_LABELS: Record<string, string> = {
  like_new: 'Like new',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
}

export const COLLECTION_SEO: Record<
  CollectionSlug,
  { name: string; title: string; description: string; intro: string; keywords: string[] }
> = {
  premium: {
    name: 'Premium',
    title: 'Premium Thrift Sneakers in Pakistan | Raja Thrifts',
    description:
      'Premium grade branded thrift sneakers in Pakistan: near-new imported pairs from Nike, Adidas, New Balance & more. Hand-inspected, delivered nationwide.',
    intro:
      'Our top grade: imported branded sneakers in near-new condition, deep-cleaned and checked by hand before they go live.',
    keywords: ['premium thrift sneakers', 'near new branded shoes Pakistan', 'like new sneakers Pakistan'],
  },
  'a-category': {
    name: 'A Category',
    title: 'A Category Thrift Shoes in Pakistan | Raja Thrifts',
    description:
      'A Category branded thrift shoes in Pakistan: imported sneakers in excellent condition with light signs of wear, at thrift prices. Nationwide delivery.',
    intro:
      'Everyday excellence: imported branded pairs with only light signs of wear, ready for daily rotation at a thrift price.',
    keywords: ['A grade thrift shoes', 'used branded sneakers Pakistan', 'imported sneakers excellent condition'],
  },
  'b-category': {
    name: 'B Category',
    title: 'B Category Budget Branded Shoes | Raja Thrifts',
    description:
      'B Category budget branded shoes in Pakistan: imported thrift sneakers with visible, disclosed wear at the lowest prices. Delivered across Pakistan.',
    intro:
      'Honest value: imported branded sneakers with visible wear that is clearly shown in the photos, priced for weekend miles.',
    keywords: ['cheap branded shoes Pakistan', 'budget sneakers Pakistan', 'second hand shoes Pakistan'],
  },
}

/** Homepage FAQs: visible on the page and sent to Google as FAQPage structured data. */
export const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is Raja Thrifts?',
    a: 'Raja Thrifts is an online thrift store in Pakistan for imported branded sneakers and shoes. Every pair is pre-owned, hand-inspected, cleaned and photographed exactly as it is.',
  },
  {
    q: 'What do Premium, A Category and B Category mean?',
    a: 'They are our condition grades. Premium pairs are near-new, A Category pairs have light signs of wear, and B Category pairs have visible wear that is shown in the photos and priced lower.',
  },
  {
    q: 'Do you deliver all over Pakistan?',
    a: 'Yes. We deliver to every city in Pakistan. The delivery charge is shown at checkout before you place your order.',
  },
  {
    q: 'How do I pay for my order?',
    a: 'You pay in advance by bank transfer and upload the payment screenshot at checkout. We verify the payment, approve your order and send you updates on WhatsApp.',
  },
  {
    q: 'How can I track my order?',
    a: 'Open the Track Order page and enter your order number with the phone number you used at checkout. You will see whether it is Pending, Approved, Dispatched or Delivered.',
  },
  {
    q: 'Do I need an account to order?',
    a: 'No. Just choose your pair, add your name, phone number and delivery address, and check out as a guest.',
  },
  {
    q: 'How can I contact Raja Thrifts?',
    a: 'Message us on WhatsApp at 0324 9557634 or 0301 8457870, or call 0310 5318980. You can also find us on Instagram and TikTok as @rajathrifts.',
  },
]

const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/[\s,.;:–-]+\S*$/, '')}…`
}

const pkr = (n: number) => `Rs ${Math.round(n).toLocaleString('en-US')}`

export function storeJsonLd(origin = SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ShoeStore',
    '@id': `${origin}/#store`,
    name: SITE_NAME,
    url: `${origin}/`,
    logo: `${origin}/brand/raja-thrifts-icon.svg`,
    image: `${origin}/og-image.jpg`,
    description:
      'Online thrift store for imported branded sneakers in Pakistan. Hand-inspected, honestly graded, delivered nationwide.',
    telephone: CONTACT_INFO.phone,
    areaServed: { '@type': 'Country', name: 'Pakistan' },
    currenciesAccepted: 'PKR',
    paymentAccepted: 'Bank transfer',
    priceRange: 'PKR',
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.tiktok],
    contactPoint: [
      ...CONTACT_INFO.whatsapp.map((n) => ({
        '@type': 'ContactPoint',
        telephone: n,
        contactType: 'customer service',
        contactOption: 'WhatsApp',
        areaServed: 'PK',
      })),
      { '@type': 'ContactPoint', telephone: CONTACT_INFO.phone, contactType: 'customer service', areaServed: 'PK' },
    ],
  }
}

export function websiteJsonLd(origin = SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: SITE_NAME,
    url: `${origin}/`,
    inLanguage: 'en-PK',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, origin = SITE_URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${origin}${it.path}`,
    })),
  }
}

// ── Pages ──────────────────────────────────────────────────────────────────

export function homeSeo(origin = SITE_URL): PageSeo {
  return {
    title: 'Raja Thrifts | Branded Thrift Sneakers in Pakistan',
    description:
      'Buy branded imported thrift sneakers in Pakistan: Nike, Adidas, New Balance & more at thrift prices. Hand-inspected, honestly graded, delivered nationwide.',
    path: '/',
    keywords: KEYWORDS,
    jsonLd: [storeJsonLd(origin), websiteJsonLd(origin), faqJsonLd()],
  }
}

export function shopSeo(origin = SITE_URL): PageSeo {
  return {
    title: 'Shop Branded Thrift Shoes Online in Pakistan | Raja Thrifts',
    description:
      'Shop all branded thrift shoes in stock: imported Nike, Adidas, New Balance sneakers and more. Filter by size, brand and grade. Delivery across Pakistan.',
    path: '/shop',
    keywords: ['buy branded shoes online Pakistan', 'thrift sneakers online', ...KEYWORDS.slice(0, 8)],
    jsonLd: [breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }], origin)],
  }
}

export function collectionSeo(slug: string, origin = SITE_URL): PageSeo | null {
  const c = COLLECTION_SEO[slug as CollectionSlug]
  if (!c) return null
  return {
    title: c.title,
    description: c.description,
    path: `/collections/${slug}`,
    keywords: [...c.keywords, ...KEYWORDS.slice(0, 6)],
    jsonLd: [
      breadcrumbJsonLd(
        [
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: `${c.name} sneakers`, path: `/collections/${slug}` },
        ],
        origin,
      ),
    ],
  }
}

export function trackSeo(): PageSeo {
  return {
    title: 'Track Your Order | Raja Thrifts',
    description:
      'Track your Raja Thrifts order with your order number and phone number: Pending, Approved, Dispatched or Delivered.',
    path: '/track-order',
  }
}

/** Plain product data, so the app (paisa) and the edge function (PKR from the database) can share it. */
export interface SeoProduct {
  slug: string
  brand: string
  name: string
  description: string
  /** Whole PKR. */
  price: number
  compareAtPrice: number | null
  collection: 'PREMIUM' | 'A CATEGORY' | 'B CATEGORY'
  conditionLabel: string
  color: string | null
  sizes: string[]
  images: string[]
  sku: string | null
  inStock: boolean
}

const COLLECTION_SLUG: Record<SeoProduct['collection'], CollectionSlug> = {
  PREMIUM: 'premium',
  'A CATEGORY': 'a-category',
  'B CATEGORY': 'b-category',
}

export function productSeo(p: SeoProduct, origin = SITE_URL): PageSeo {
  const fullName = p.name.toLowerCase().startsWith(p.brand.toLowerCase()) ? p.name : `${p.brand} ${p.name}`
  const sizes = p.sizes.length ? `Size ${p.sizes.join('/')}` : ''
  const grade = COLLECTION_SEO[COLLECTION_SLUG[p.collection]]
  const titleCore = clip(`${fullName}${sizes ? ` ${sizes}` : ''}`, 44)
  const url = `${origin}/products/${p.slug}`
  const description = clip(
    `Buy ${fullName}${p.sizes.length ? ` (EU ${p.sizes.join(', ')})` : ''} for ${pkr(p.price)} in Pakistan` +
      `${p.compareAtPrice ? ` (retail ${pkr(p.compareAtPrice)})` : ''}. ` +
      `${grade.name} grade, ${p.conditionLabel.toLowerCase()} condition, hand-inspected. ` +
      `${p.inStock ? 'Nationwide delivery.' : 'Sold out.'}`,
    158,
  )
  return {
    title: `${titleCore} – ${pkr(p.price)} | ${SITE_NAME}`,
    description,
    path: `/products/${p.slug}`,
    image: p.images[0],
    keywords: [
      fullName,
      `${fullName} price in Pakistan`,
      `${p.brand} shoes Pakistan`,
      `${p.brand} sneakers`,
      ...(p.sizes.length ? [`${p.brand} shoes size ${p.sizes[0]}`] : []),
      'thrift sneakers Pakistan',
      'branded shoes Pakistan',
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: fullName,
        description: p.description || description,
        image: p.images,
        ...(p.sku ? { sku: p.sku } : {}),
        brand: { '@type': 'Brand', name: p.brand },
        ...(p.color ? { color: p.color } : {}),
        ...(p.sizes.length ? { size: p.sizes.map((s) => `EU ${s}`).join(', ') } : {}),
        category: 'Shoes > Sneakers',
        itemCondition: 'https://schema.org/UsedCondition',
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'PKR',
          price: String(Math.round(p.price)),
          availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          itemCondition: 'https://schema.org/UsedCondition',
          seller: { '@type': 'Organization', name: SITE_NAME, '@id': `${origin}/#store` },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PK' },
          },
        },
      },
      breadcrumbJsonLd(
        [
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: `${grade.name} sneakers`, path: `/collections/${COLLECTION_SLUG[p.collection]}` },
          { name: fullName, path: `/products/${p.slug}` },
        ],
        origin,
      ),
    ],
  }
}

/** SEO for a path, or null when the page is not public (dashboard, cart…) or needs data (products). */
export function staticPageSeo(pathname: string, origin = SITE_URL): PageSeo | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return homeSeo(origin)
  if (path === '/shop') return shopSeo(origin)
  if (path === '/track-order') return trackSeo()
  const m = path.match(/^\/collections\/([a-z-]+)$/)
  if (m) return collectionSeo(m[1], origin)
  return null
}
