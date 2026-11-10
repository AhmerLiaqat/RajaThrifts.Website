import { ArrowLeft, ArrowRight, Flame } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { discountPercent } from '@/lib/utils/format'
import { useHomeProducts } from '../useHomeProducts'

/** BIGGEST SAVINGS: in-stock pairs with the largest discount off original retail, in a swipeable row. */
export function DealsSection() {
  const { items, isDemo } = useHomeProducts()
  const scroller = useRef<HTMLUListElement>(null)
  const deals = items
    .filter((p) => p.totalStock > 0 && discountPercent(p.price, p.compareAtPrice) > 0)
    .sort((a, b) => discountPercent(b.price, b.compareAtPrice) - discountPercent(a.price, a.compareAtPrice))
    .slice(0, 10)
  if (deals.length < 3) return null

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="deals-title" className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-deal-soft via-white to-gold-soft p-5 ring-1 ring-[#f6d9c4] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-deal px-3 py-1 text-xs font-bold text-white">
                <Flame className="size-3.5" aria-hidden /> Biggest savings
              </span>
              <h2 id="deals-title" className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight font-extrabold tracking-tight text-ink">
                Retail brands, <span className="text-deal">fraction of the price</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-muted">
                Compared with the original retail price. One pair each, so these go fast.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Scroll deals left"
                className="grid size-11 place-items-center rounded-xl border border-line-strong bg-white text-ink shadow-sm transition-colors hover:bg-brand-navy hover:text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Scroll deals right"
                className="grid size-11 place-items-center rounded-xl border border-line-strong bg-white text-ink shadow-sm transition-colors hover:bg-brand-navy hover:text-white"
              >
                <ArrowRight className="size-4" />
              </button>
              <Link
                to={`${paths.shop}?sort=price_asc&stock=in_stock`}
                className="ml-1 hidden h-11 items-center rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-800 sm:inline-flex"
              >
                View all
              </Link>
            </div>
          </div>

          <ul
            ref={scroller}
            className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-8 sm:px-8"
          >
            {deals.map((p) => (
              <li key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[40%] md:w-[30%] lg:w-[23%]">
                <ProductCard product={p} isDemo={isDemo} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
