import { normaliseWhatsappNumber } from '@/lib/utils/whatsapp'

/** Raja Thrifts contact details and social profiles, shown across the storefront. */
export const CONTACT = {
  /** WhatsApp only (no calls). The first one is the main number. */
  whatsapp: ['0324 9557634', '0301 8457870'],
  /** Calls only. */
  phone: '0310 5318980',
  instagram: { handle: '@rajathrifts', url: 'https://www.instagram.com/rajathrifts' },
  tiktok: { handle: '@rajathrifts', url: 'https://www.tiktok.com/@rajathrifts' },
} as const

/** wa.me link to one of the shop's WhatsApp numbers, optionally with a pre-filled message. */
export function shopWhatsappUrl(number: string = CONTACT.whatsapp[0], text?: string) {
  return `https://wa.me/${normaliseWhatsappNumber(number)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** tel: link for the calls-only number. */
export const shopPhoneUrl = () => `tel:+92${CONTACT.phone.replace(/\D/g, '').replace(/^0/, '')}`
