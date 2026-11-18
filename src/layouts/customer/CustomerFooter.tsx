import { ArrowUpRight, PackageCheck, Phone, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { COLLECTION_META } from '@/constants/collections'
import { Logo } from '@/components/brand/Logo'
import { InstagramIcon, TikTokIcon } from '@/components/brand/SocialIcons'
import { WhatsAppGlyph } from '@/components/feedback/WhatsAppFloat'
import { CONTACT, shopPhoneUrl, shopWhatsappUrl } from '@/constants/contact'
import { env } from '@/config/env'
import { UNSPLASH_CREDIT_URL } from '@/mocks/demo-media'

const YEAR = new Date().getFullYear()

const columns = [
  {
    title: 'Shop',
    links: [
      ...Object.values(COLLECTION_META).map((c) => ({ label: c.label, to: paths.collection(c.slug) })),
      { label: 'Shop all', to: paths.shop },
    ],
  },
  {
    title: 'Orders',
    links: [
      { label: 'Track your order', to: paths.trackOrder },
      { label: 'Customer reviews', to: paths.reviews },
      { label: 'Bag', to: paths.cart },
      { label: 'Wishlist', to: paths.wishlist },
      { label: 'Admin login', to: paths.login },
    ],
  },
]

export function CustomerFooter() {
  return (
    <footer className="mt-16 bg-brand-navy text-white/80">
      {/* Service promises */}
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: ShieldCheck, title: 'Hand-inspected', text: 'Every pair checked and honestly graded' },
            { icon: PackageCheck, title: 'Cleaned & photographed', text: 'What you see is the pair you get' },
            { icon: Truck, title: 'Nationwide delivery', text: 'Tracked shipping across Pakistan' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 text-gold">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-sm text-white/65">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo tone="dark" tagline size="lg" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Imported thrift footwear, graded into Premium, A Category and B Category. Get a first look at every
              new shipment.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={CONTACT.instagram.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                <InstagramIcon className="size-4" /> Instagram
              </a>
              <a
                href={CONTACT.tiktok.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                <TikTokIcon className="size-4" /> TikTok
              </a>
            </div>
            <p className="mt-3 text-xs text-white/55">
              Follow {CONTACT.instagram.handle} for every new shipment first.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-white">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-sm text-white/65 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="text-sm font-semibold text-white">Contact us</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {CONTACT.whatsapp.map((n) => (
                  <li key={n}>
                    <a
                      href={shopWhatsappUrl(n)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-white/65 transition-colors hover:text-white"
                    >
                      <WhatsAppGlyph className="size-4 text-[#25D366]" />
                      {n}
                    </a>
                  </li>
                ))}
                <li className="text-xs text-white/45">WhatsApp only (messages)</li>
                <li>
                  <a href={shopPhoneUrl()} className="inline-flex items-center gap-2 text-white/65 transition-colors hover:text-white">
                    <Phone className="size-4 text-gold" />
                    {CONTACT.phone}
                  </a>
                </li>
                <li className="text-xs text-white/45">Calls</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>© {YEAR} Raja Thrifts. Imported thrift footwear.</p>
          <p className="max-w-xl md:text-right">
            {env.useDemoCatalog
              ? 'Design preview: products, prices and reviews shown are sample data, not current inventory. '
              : 'Some decorative photography '}
            from{' '}
            <a
              href={UNSPLASH_CREDIT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-white/75 underline-offset-4 hover:underline"
            >
              Unsplash <ArrowUpRight className="size-3" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
