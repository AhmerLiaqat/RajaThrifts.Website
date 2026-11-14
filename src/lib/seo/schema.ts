import { CONTACT } from '@/constants/contact'
import type { Product } from '@/types/product'

/** schema.org data for the shop itself (shown in Google's knowledge panel / brand results). */
export function storeSchema(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ShoeStore',
    name: 'Raja Thrifts',
    url: `${origin}/`,
    logo: `${origin}/brand/raja-thrifts-icon.svg`,
    image: `${origin}/og-image.jpg`,
    description: 'Imported branded thrift sneakers, hand-inspected and honestly graded. Delivered across Pakistan.',
    telephone: `+92${CONTACT.phone.replace(/\D/g, '').replace(/^0/, '')}`,
    areaServed: 'PK',
    priceRange: 'PKR',
    sameAs: [CONTACT.instagram.url, CONTACT.tiktok.url],
  }
}

/** schema.org Product + Offer, so Google can show price, stock and "used" condition. */
export function productSchema(p: Product, origin: string) {
  const inStock = p.variants.some((v) => v.quantity > 0)
  const url = `${origin}/products/${p.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brand} ${p.name}`,
    description: p.description || `${p.brand} ${p.name}, imported pre-owned pair, hand-inspected and graded.`,
    image: p.images.map((i) => i.url),
    sku: p.variants[0]?.sku,
    brand: { '@type': 'Brand', name: p.brand },
    ...(p.color ? { color: p.color } : {}),
    itemCondition: 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PKR',
      price: (p.price / 100).toFixed(0),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: { '@type': 'Organization', name: 'Raja Thrifts' },
    },
  }
}
