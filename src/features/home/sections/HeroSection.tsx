import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, MessageCircle, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DemoTag } from '@/components/ui/DemoTag'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { discountPercent, formatPrice } from '@/lib/utils/format'
import { HERO_SHOWCASE_PHOTO, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { motion as m } from '@/theme/tokens'
import { useHomeProducts } from '../useHomeProducts'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: m.ease.outExpo, delay },
})

const TRUST = [
  { icon: ShieldCheck, label: 'Hand-inspected', sub: 'Every pair checked' },
  { icon: BadgeCheck, label: '3 honest grades', sub: 'Premium · A · B' },
  { icon: MessageCircle, label: 'WhatsApp support', sub: 'Quick, real replies' },
  { icon: Truck, label: 'Nationwide delivery', sub: 'Tracked to your door' },
]

/** HERO: bold navy banner with the newest premium pair, then a quick-shop bar and trust row. */
export function HeroSection() {
  const { items, isDemo } = useHomeProducts()
  const inStock = items.filter((p) => p.totalStock > 0)
  const featured = inStock.find((p) => p.collection === 'PREMIUM') ?? inStock[0]
  // Live mode: a real product photo; demo photography is only a labelled fallback.
  const showcase = isDemo ? undefined : inStock.find((p) => p.primaryImage)
  const off = featured ? discountPercent(featured.price, featured.compareAtPrice) : 0

  // Quick-shop shortcuts built from what is actually in stock.
  const sizes = [...new Set(inStock.flatMap((p) => p.availableSizes.map((s) => s.value)))]
    .sort((a, b) => Number(a) - Number(b))
    .slice(0, 10)
  const brandCounts = inStock.reduce<Record<string, number>>((acc, p) => {
    acc[p.brand] = (acc[p.brand] ?? 0) + 1
    return acc
  }, {})
  const brands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([b]) => b)

  return (
    <section aria-labelledby="hero-title" className="relative pt-4 sm:pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="hero-navy relative isolate overflow-hidden rounded-3xl text-white shadow-[0_30px_60px_-30px_rgb(12_18_48/0.7)]">
          <div aria-hidden className="dot-grid absolute inset-0 -z-10 opacity-60" />
          <div
            aria-hidden
            className="absolute -right-24 -bottom-40 -z-10 size-[28rem] rounded-full border-[40px] border-white/[0.04]"
          />
          <div
            aria-hidden
            className="absolute top-10 right-[38%] -z-10 hidden size-24 rotate-12 rounded-3xl border border-gold/30 lg:block"
          />

          <div className="grid items-center gap-10 px-6 pt-10 pb-24 sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:px-14 lg:pt-14 lg:pb-28">
            {/* Copy */}
            <div>
              <motion.span
                {...rise(0)}
                className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold"
              >
                <Sparkles className="size-3.5" aria-hidden />
                Fresh imported shipment
              </motion.span>

              <motion.h1
                {...rise(0.05)}
                id="hero-title"
                className="mt-5 text-[clamp(2.4rem,5.6vw,4.4rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-white"
              >
                Branded sneakers.
                <br />
                <span className="bg-gradient-to-r from-[#f6d77e] via-gold to-[#f0c55a] bg-clip-text text-transparent">
                  Thrift prices.
                </span>
              </motion.h1>

              <motion.p {...rise(0.1)} className="mt-5 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
                Imported Nike, Adidas, New Balance and more, graded by hand into three honest tiers.
                Every pair is cleaned, checked and photographed exactly as it is.
              </motion.p>

              <motion.div {...rise(0.15)} className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={paths.shop}
                  className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gold px-6 text-base font-bold text-brand-navy shadow-[0_10px_30px_-10px_rgb(201_154_46/0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#d8ab43]"
                >
                  Shop all pairs
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to={paths.collection('premium')}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
                >
                  Explore Premium
                </Link>
              </motion.div>

              <motion.dl {...rise(0.2)} className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                {[
                  { k: inStock.length ? `${inStock.length}` : '—', v: 'Pairs in stock' },
                  { k: Object.keys(brandCounts).length ? `${Object.keys(brandCounts).length}` : '—', v: 'Brands' },
                  { k: '1 of 1', v: 'Every pair unique' },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="sr-only">{s.v}</dt>
                    <dd className="text-2xl font-extrabold text-white tabular-nums">{s.k}</dd>
                    <dd className="text-xs font-medium text-white/60">{s.v}</dd>
                  </div>
                ))}
              </motion.dl>
            </div>

            {/* Showcase */}
            <motion.div
              initial={{ opacity: 0, y: 16, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.7, ease: m.ease.outExpo, delay: 0.1 }}
              className="relative mx-auto w-full max-w-[440px]"
            >
              <div
                aria-hidden
                className="absolute inset-6 -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(201_154_46/0.45),transparent)] blur-2xl"
              />
              <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-white/10 ring-1 ring-white/20">
                {showcase?.primaryImage ? (
                  <Link to={paths.product(showcase.slug)} aria-label={`${showcase.brand} ${showcase.name}`}>
                    <img
                      src={showcase.primaryImage.url}
                      alt={showcase.primaryImage.alt}
                      fetchPriority="high"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 hover:scale-[1.04]"
                    />
                  </Link>
                ) : (
                  <img
                    src={unsplash(HERO_SHOWCASE_PHOTO.id, 1000)}
                    srcSet={unsplashSrcSet(HERO_SHOWCASE_PHOTO.id, [600, 900, 1200])}
                    sizes="(min-width: 1024px) 34vw, 90vw"
                    alt={HERO_SHOWCASE_PHOTO.alt}
                    fetchPriority="high"
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                {!showcase && <DemoTag label="Demo photo" className="absolute top-4 left-4" />}
              </div>

              {featured && (
                <Link
                  to={paths.product(featured.slug)}
                  className="group absolute -bottom-8 left-1/2 flex w-[88%] -translate-x-1/2 items-center gap-3 rounded-2xl bg-white p-3 text-ink shadow-[0_20px_40px_-15px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-1 sm:w-[92%]"
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-sunken">
                    {featured.primaryImage && (
                      <img src={featured.primaryImage.url} alt="" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <CollectionBadge collection={featured.collection} variant="solid" />
                      <span className="truncate text-xs text-ink-subtle">{featured.brand}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold">{featured.name}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold tabular-nums">{formatPrice(featured.price)}</span>
                      {off > 0 && <span className="text-xs font-bold text-deal">−{off}%</span>}
                    </span>
                  </span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-navy text-white transition-colors group-hover:bg-gold group-hover:text-brand-navy">
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              )}
            </motion.div>
          </div>
        </div>

        {/* Quick shop: overlaps the banner for depth */}
        <motion.div
          {...rise(0.25)}
          className="relative z-10 mx-auto -mt-14 grid max-w-6xl gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_-25px_rgb(17_26_51/0.35)] sm:mx-6 md:grid-cols-2 md:p-6 lg:mx-auto"
        >
          <div>
            <p className="text-sm font-bold text-ink">Shop by size (EU)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(sizes.length ? sizes : ['39', '40', '41', '42', '43', '44']).map((s) => (
                <Link
                  key={s}
                  to={`${paths.shop}?size=${encodeURIComponent(s)}&stock=in_stock`}
                  className="grid h-10 min-w-11 place-items-center rounded-lg border border-line-strong px-2 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-sand hover:bg-sand hover:text-white"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Popular brands</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(brands.length ? brands : ['Nike', 'Adidas', 'New Balance']).map((b) => (
                <Link
                  key={b}
                  to={`${paths.shop}?brand=${encodeURIComponent(b)}`}
                  className="inline-flex h-10 items-center rounded-lg bg-surface-sunken px-4 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:bg-brand-navy hover:text-white"
                >
                  {b}
                </Link>
              ))}
              <Link
                to={paths.shop}
                className="inline-flex h-10 items-center gap-1 px-2 text-sm font-semibold text-sand hover:underline"
              >
                All brands <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Trust row */}
        <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <li key={label} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 sm:p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand-100 text-sand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{label}</span>
                <span className="block truncate text-xs text-ink-subtle">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
