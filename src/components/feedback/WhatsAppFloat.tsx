import { motion } from 'framer-motion'
import { CONTACT, shopWhatsappUrl } from '@/constants/contact'
import { usePublicSettings } from '@/features/store/usePublicSettings'

/** Official-style WhatsApp glyph (lucide has no brand icons). */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden>
      <path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.3.6 4.53 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.62c-1.98 0-3.92-.53-5.61-1.53l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.6 10.6 0 0 1 5.4 16c0-5.86 4.77-10.62 10.64-10.62 5.86 0 10.6 4.76 10.6 10.62 0 5.86-4.74 10.62-10.6 10.62Zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.15-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.66s1.14 3.08 1.3 3.3c.16.2 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.2 2 .12.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  )
}

/**
 * Floating button that opens the shop's WhatsApp group. The link is set by the
 * admin in Dashboard → Store settings; nothing renders until it exists.
 */
export function WhatsAppFloat() {
  const { data } = usePublicSettings()
  // The WhatsApp group from Store settings, otherwise a chat with the main shop number.
  const url = data?.whatsappGroupUrl || shopWhatsappUrl(CONTACT.whatsapp[0], 'Assalam o Alaikum! I have a question about a pair on Raja Thrifts.')

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={data?.whatsappGroupUrl ? 'Join our WhatsApp group' : 'Chat with us on WhatsApp'}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 260, damping: 18 }}
      className="group fixed right-4 bottom-5 z-40 flex flex-row-reverse items-center gap-3 sm:right-6 sm:bottom-6"
    >
      <span className="relative grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-6px_rgb(37_211_102/0.6)] transition-transform duration-300 group-hover:scale-110">
        <span aria-hidden className="absolute inset-0 animate-wa-pulse rounded-full bg-[#25D366]" />
        <WhatsAppGlyph className="relative size-7" />
      </span>
      <span className="glass hidden rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-bone opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
        {data?.whatsappGroupUrl ? 'Join our WhatsApp group' : 'Chat with us on WhatsApp'}
      </span>
    </motion.a>
  )
}
