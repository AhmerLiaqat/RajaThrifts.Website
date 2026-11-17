import { motion } from 'framer-motion'
import { ArrowRight, Ruler, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DemoTag } from '@/components/ui/DemoTag'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { discountPercent, formatPrice } from '@/lib/utils/format'
import { HERO_SHOWCASE_PHOTO, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { sizeOptions } from '@/services/products/product.query'
import { motion as m } from '@/theme/tokens'
import { useHomeProducts } from '../useHomeProducts'
import { SizePickerSheet } from './SizePickerSheet'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: m.ease.outExpo, delay },
})

/** HERO: compact navy banner with ONE showcase pair (the one marked "Feature on the homepage"), then a quick-shop bar. */
export function HeroSection() {
  const { items, isDemo } = useHomeProducts()
  const [sizesOpen, setSizesOpen] = useState(false)
  const closeSizes = useCallback(() => setSizesOpen(false), [])
  const inStock = items.filter((p) => p.totalStock > 0)
  // One pair only: the newest in-stock pair marked "Feature on the homepage" (premium first),
  // falling back to the newest premium pair, then the newest pair.
  const featured =
    inStock.find((p) => p.isFeatured && p.collection === 'PREMIUM') ??
    inStock.find((p) => p.isFeatured) ??
    inStock.find((p) => p.collection === 'PREMIUM') ??
    inStock[0]
  // The big photo and the price card always show the same pair. Demo mode uses labelled stock photography.
  const showcase = !isDemo && featured?.primaryImage ? featured : undefined
  const off = featured ? discountPercent(featured.price, featured.compareAtPrice) : 0

  // Quick-shop shortcuts built from what is actually in stock.
  // EU and UK sizes are listed separately, each as entered by staff per pair.
  const inStockSizes = inStock.flatMap((p) => p.availableSizes)
  const euSizes = sizeOptions(inStockSizes).map((s) => s.value)
  const ukSizes = [...new Set(inStockSizes.map((s) => s.uk).filter((v): v is string => !!v))].sort(
    (a, b) => Number(a) - Number(b),
  )
  const sizeRows = [
    { system: 'EU', param: 'size', values: euSizes.length ? euSizes : ['39', '40', '41', '42', '43', '44'] },
    { system: 'UK', param: 'uk', values: ukSizes.length ? ukSizes : ['6', '7', '8', '9', '10'] },
  ] as const
  const brandCounts = inStock.reduce<Record<string, number>>((acc, p) => {
    acc[p.brand] = (acc[p.brand] ?? 0) + 1
    return acc
  }, {})
  const brands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([b]) => b)

  return (
    <section aria-labelledby="hero-title" className="relative pt-3 sm:pt-4">
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

          <div className="grid items-center gap-10 px-6 pt-7 pb-16 sm:px-10 lg:grid-cols-[1.3fr_1fr] lg:gap-6 lg:px-12 lg:pt-9 lg:pb-16">
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
                className="mt-4 text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-white"
              >
                Branded sneakers.
                <br />
                <span className="bg-gradient-to-r from-[#f6d77e] via-gold to-[#f0c55a] bg-clip-text text-transparent">
                  Thrift prices.
                </span>
              </motion.h1>

              <motion.p {...rise(0.1)} className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
                Pakistan&apos;s thrift store for imported branded shoes: Nike, Adidas, New Balance and more,
                graded by hand into three honest tiers. Every pair is cleaned, checked and photographed exactly as it is.
              </motion.p>

              <motion.div {...rise(0.15)} className="mt-6 flex flex-wrap gap-3">
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

              <motion.dl {...rise(0.2)} className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                {[
                  { k: inStock.length ? `${inStock.length}` : '—', v: 'Pairs in stock' },
                  { k: Object.keys(brandCounts).length ? `${Object.keys(brandCounts).length}` : '—', v: 'Brands' },
                  { k: '1 of 1', v: 'Every pair unique' },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="sr-only">{s.v}</dt>
                    <dd className="text-xl font-extrabold text-white tabular-nums">{s.k}</dd>
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
              className="relative mx-auto w-full max-w-[300px] lg:max-w-[330px]"
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
                  className="group absolute -bottom-6 left-1/2 flex w-[92%] -translate-x-1/2 items-center gap-3 rounded-2xl bg-white p-2.5 text-ink shadow-[0_20px_40px_-15px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-1 sm:w-[92%]"
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
          className="relative z-10 mx-auto -mt-8 grid max-w-6xl gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_20px_50px_-25px_rgb(17_26_51/0.35)] sm:mx-6 md:grid-cols-[auto_1fr] md:gap-8 md:p-5 lg:mx-auto"
        >
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold text-ink">Find your size</p>
            <button
              type="button"
              onClick={() => setSizesOpen(true)}
              aria-haspopup="dialog"
              className="mt-3 inline-flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface-sunken px-4 text-sm font-semibold text-ink transition-colors hover:border-sand hover:bg-white sm:w-auto sm:min-w-64"
            >
              <span className="flex items-center gap-2">
                <Ruler className="size-4 text-sand" aria-hidden /> Shop by size (EU / UK)
              </span>
              <SlidersHorizontal className="size-4 text-ink-subtle" aria-hidden />
            </button>
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

        <SizePickerSheet open={sizesOpen} onClose={closeSizes} rows={sizeRows} />
      </div>
    </section>
  )
}
