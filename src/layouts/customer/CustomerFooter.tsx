import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { COLLECTION_META } from '@/constants/collections'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { gsap } from '@/lib/gsap'
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
    title: 'Account',
    links: [
      { label: 'Sign in', to: paths.login },
      { label: 'My account', to: paths.account },
      { label: 'Cart', to: paths.cart },
    ],
  },
]

export function CustomerFooter() {
  const ref = useRef<HTMLElement>(null)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  useScrollAnimation(ref, () => {
    gsap.from('[data-footer-letter]', {
      yPercent: 100,
      stagger: 0.04,
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: '[data-footer-wordmark]', start: 'top 95%' },
    })
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    // No newsletter backend yet. Be honest about it instead of faking success.
    setNotice('Newsletter sign-up is coming soon. Nothing was submitted.')
    setEmail('')
  }

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-night/30 to-night/80 text-bone backdrop-blur-sm">
      <div className="mx-auto max-w-[1600px] px-4 pt-20 sm:px-6 lg:px-10 lg:pt-28">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="eyebrow">Join the drop list</p>
            <h2 className="mt-5 max-w-md text-3xl leading-tight font-medium sm:text-4xl">
              First look at every new shipment, before it hits the store.
            </h2>
            <form onSubmit={onSubmit} className="mt-8 max-w-md">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex items-center border-b border-bone/25 transition-colors focus-within:border-sand">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-14 flex-1 bg-transparent text-sm text-bone placeholder:text-bone/35 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="grid size-10 place-items-center text-sand transition-transform hover:translate-x-1"
                >
                  <ArrowRight className="size-5" />
                </button>
              </div>
              <p role="status" className="mt-3 min-h-5 text-xs text-ink-muted">
                {notice}
              </p>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="font-display text-[11px] tracking-[0.28em] text-ink-subtle uppercase">
                  {col.title}
                </p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-sm text-bone/80 transition-colors hover:text-sand">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Giant wordmark */}
        <div
          data-footer-wordmark
          aria-hidden
          className="mt-24 flex select-none justify-between overflow-hidden leading-[0.8] lg:mt-32"
        >
          {'RAJATHRIFS'.split('').map((ch, i) => (
            <span
              key={i}
              data-footer-letter
              className={`inline-block font-display text-[clamp(3.5rem,15.5vw,17rem)] font-semibold ${i >= 4 ? 'text-sand' : 'text-bone'}`}
            >
              {ch}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-bone/8 py-8 text-xs text-ink-subtle md:flex-row md:items-center md:justify-between">
          <p>© {YEAR} RajaThrifs. Imported thrift footwear.</p>
          <p className="max-w-xl md:text-right">
            Design preview: products, prices and reviews shown are sample data, not current inventory.
            Photography from{' '}
            <a
              href={UNSPLASH_CREDIT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-bone/70 underline-offset-4 hover:underline"
            >
              Unsplash <ArrowUpRight className="size-3" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
