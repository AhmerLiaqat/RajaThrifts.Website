import { ArrowUpRight, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { COLLECTION_META } from '@/constants/collections'
import { Logo } from '@/components/brand/Logo'
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
    title: 'Help',
    links: [
      { label: 'Grading guide', to: paths.shop },
      { label: 'Size guide', to: paths.shop },
      { label: 'Shipping & returns', to: paths.shop },
      { label: 'Contact', to: paths.shop },
    ],
  },
  {
    title: 'Orders',
    links: [
      { label: 'Track your order', to: paths.trackOrder },
      { label: 'Bag', to: paths.cart },
      { label: 'Wishlist', to: paths.wishlist },
      { label: 'Staff login', to: paths.login },
    ],
  },
]

export function CustomerFooter() {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // No newsletter backend yet. Be honest about it instead of faking success.
    setNotice('Newsletter sign-up is coming soon. Nothing was submitted.')
    setEmail('')
  }

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
            <form onSubmit={onSubmit} className="mt-6 max-w-md">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-lg bg-gold px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-gold/90"
                >
                  Subscribe
                </button>
              </div>
              <p role="status" className="mt-2 min-h-5 text-xs text-white/60">
                {notice}
              </p>
            </form>
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
