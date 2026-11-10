import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { ButtonLink } from '@/components/ui'
import { DemoTag } from '@/components/ui/DemoTag'
import { formatPrice } from '@/lib/utils/format'
import { HERO_SHOWCASE_PHOTO, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { motion as m } from '@/theme/tokens'
import { useHomeProducts } from '../useHomeProducts'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: m.ease.outExpo, delay },
})

const PROMISES = [
  { icon: ShieldCheck, label: 'Hand-inspected', sub: 'Every single pair' },
  { icon: BadgeCheck, label: '3 honest grades', sub: 'Premium · A · B' },
  { icon: Truck, label: 'Nationwide delivery', sub: 'Tracked to your door' },
]

/** HERO: clean split layout with a single product showcase. */
export function HeroSection() {
  const { items, isDemo } = useHomeProducts()
  const inStock = items.filter((p) => p.totalStock > 0)
  // Chip: newest PREMIUM pair, else the newest pair of any grade.
  const featured = inStock.find((p) => p.collection === 'PREMIUM') ?? inStock[0]
  // Live mode: the newest real photo fills the frame; demo photography is only a labelled fallback.
  const showcase = isDemo ? undefined : inStock.find((p) => p.primaryImage)

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line bg-gradient-to-b from-sand-100/60 to-surface">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:py-20">
        {/* Copy */}
        <div>
          <motion.span
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-sand/15 bg-white px-3 py-1 text-xs font-semibold text-sand shadow-sm"
          >
            <span className="size-1.5 rounded-full bg-gold" aria-hidden />
            Imported thrift footwear · Graded by hand
          </motion.span>

          <motion.h1
            {...rise(0.05)}
            id="hero-title"
            className="mt-5 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-ink"
          >
            Quality pre-loved sneakers, <span className="text-sand">honestly graded.</span>
          </motion.h1>

          <motion.p {...rise(0.1)} className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
            Imported sneakers and shoes sorted into three clear tiers. Every pair is cleaned, checked and
            photographed exactly as it is, so you know what you are buying.
          </motion.p>

          <motion.div {...rise(0.15)} className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={paths.shop} variant="accent" size="lg">
              Shop all pairs <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink to={paths.collection('premium')} variant="outline" size="lg">
              View Premium
            </ButtonLink>
          </motion.div>

          <motion.ul {...rise(0.2)} className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
            {PROMISES.map(({ icon: Icon, label, sub }) => (
              <li key={label} className="flex items-center gap-3 sm:items-start">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-sand shadow-sm ring-1 ring-line">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{label}</span>
                  <span className="block text-xs text-ink-subtle">{sub}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: m.ease.outExpo, delay: 0.1 }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          <div className="relative aspect-[4/4.2] overflow-hidden rounded-2xl bg-surface-sunken shadow-pop ring-1 ring-line">
            {showcase?.primaryImage ? (
              <Link to={paths.product(showcase.slug)} aria-label={`${showcase.brand} ${showcase.name}`}>
                <img
                  src={showcase.primaryImage.url}
                  alt={showcase.primaryImage.alt}
                  fetchPriority="high"
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
              </Link>
            ) : (
              <img
                src={unsplash(HERO_SHOWCASE_PHOTO.id, 1200)}
                srcSet={unsplashSrcSet(HERO_SHOWCASE_PHOTO.id, [600, 900, 1200, 1600])}
                sizes="(min-width: 1024px) 40vw, 90vw"
                alt={HERO_SHOWCASE_PHOTO.alt}
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover"
              />
            )}
            {!showcase && <DemoTag label="Demo photography" className="absolute top-4 right-4" />}
          </div>

          {featured && (
            <Link
              to={paths.product(featured.slug)}
              className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 pr-5 shadow-pop transition-colors hover:border-sand/40 sm:-left-6"
            >
              {featured.primaryImage && (
                <img src={featured.primaryImage.url} alt="" className="size-12 rounded-lg bg-surface-sunken object-cover" />
              )}
              <span className="text-left">
                <span className="block text-xs font-semibold text-sand">
                  {featured.collection === 'PREMIUM' ? 'Premium pick' : 'Just in'}
                </span>
                <span className="block max-w-[11rem] truncate text-sm font-semibold text-ink">{featured.name}</span>
                <span className="block text-sm text-ink-muted tabular-nums">{formatPrice(featured.price)}</span>
              </span>
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  )
}
