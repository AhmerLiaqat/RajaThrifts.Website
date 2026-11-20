import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DELIVERY_CITIES, FAQS } from '@/lib/seo/copy'
import { HomeHeading } from '../components/HomeHeading'

/** Internal links with the phrases people search for. */
const POPULAR = [
  { label: 'Thrift shoes', to: paths.shop },
  { label: 'Thrifted sneakers', to: paths.shop },
  { label: 'Premium thrift shoes', to: paths.collection('premium') },
  { label: 'Cheap branded shoes', to: paths.collection('b-category') },
  { label: 'Nike thrift shoes', to: `${paths.shop}?brand=Nike` },
  { label: 'Adidas thrift shoes', to: `${paths.shop}?brand=Adidas` },
  { label: 'New Balance thrift shoes', to: `${paths.shop}?brand=New%20Balance` },
  { label: 'Track my order', to: paths.trackOrder },
]

/**
 * About + FAQ: real, readable text about the shop (what search engines rank on) and the
 * questions buyers ask. The same FAQs are sent to Google as FAQPage structured data.
 */
export function SeoFaqSection() {
  return (
    <section aria-labelledby="about-title" className="border-t border-line py-16 lg:py-20">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:px-8">
        <div>
          <HomeHeading id="about-title" eyebrow="About Raja Thrifts" title="Thrifted shoes &" highlight="branded sneakers in Pakistan" />
          <div className="mt-5 space-y-4 text-base leading-relaxed text-ink-muted">
            <p>
              Raja Thrifts is an online <strong className="text-ink">thrift store</strong> for{' '}
              <strong className="text-ink">thrifted shoes</strong> and imported branded sneakers in Pakistan. Often called
              landa shoes, our pre-owned pairs come from brands like Nike, Adidas, New Balance, Puma and more, and every
              one is checked, cleaned and photographed exactly as it is.
            </p>
            <p>
              Each pair is graded so you know what you are buying:{' '}
              <Link to={paths.collection('premium')} className="font-semibold text-sand hover:underline">
                Premium
              </Link>{' '}
              (near-new),{' '}
              <Link to={paths.collection('a-category')} className="font-semibold text-sand hover:underline">
                A Category
              </Link>{' '}
              (light wear) and{' '}
              <Link to={paths.collection('b-category')} className="font-semibold text-sand hover:underline">
                B Category
              </Link>{' '}
              (visible wear, lowest prices). Every pair is one of a kind, so you get branded shoes at thrift prices.
            </p>
            <p>
              We deliver thrift shoes all over Pakistan, including {DELIVERY_CITIES.slice(0, -1).join(', ')} and{' '}
              {DELIVERY_CITIES[DELIVERY_CITIES.length - 1]}. Order online as a guest and track your order anytime.
            </p>
            <div>
              <h3 className="text-sm font-bold text-ink">Popular searches</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {POPULAR.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-sm font-medium text-ink hover:border-sand hover:text-sand"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {FAQS.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
                  <h3 className="text-sm font-semibold">{f.q}</h3>
                  <ChevronDown className="size-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
