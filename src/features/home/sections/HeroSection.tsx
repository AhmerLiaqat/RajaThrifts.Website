import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { SparkleIcon, Sparkles } from '@/components/motion/Sparkles'
import { ButtonLink } from '@/components/ui'
import { DemoTag } from '@/components/ui/DemoTag'
import { formatPrice } from '@/lib/utils/format'
import { DEMO_PREMIUM } from '@/mocks/demo-catalog'
import { HERO_SHOWCASE_PHOTO, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { motion as m } from '@/theme/tokens'

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, ease: m.ease.outExpo, delay },
})

const PROMISES = [
  { icon: ShieldCheck, label: 'Hand-inspected', sub: 'Every single pair' },
  { icon: BadgeCheck, label: '3 honest grades', sub: 'Premium · A · B' },
  { icon: Truck, label: 'Cash on delivery', sub: 'Pay at your door' },
]

/** HERO: starlit split layout with a glowing showcase frame and floating glass chips. */
export function HeroSection() {
  const featured = DEMO_PREMIUM[0]

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pt-28 pb-16 lg:min-h-[100svh] lg:pt-32 lg:pb-20"
    >
      <Sparkles count={18} seed={3} />

      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-10">
        {/* Copy */}
        <div className="relative z-10">
          <motion.span
            {...rise(0.1)}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 font-display text-[11px] font-medium tracking-[0.26em] text-sand uppercase"
          >
            <SparkleIcon className="size-3.5" />
            Imported thrift footwear · Graded by hand
          </motion.span>

          <motion.h1
            {...rise(0.2)}
            id="hero-title"
            className="mt-7 text-[clamp(2.9rem,7.2vw,6.25rem)] leading-[0.95] font-semibold tracking-[-0.035em]"
          >
            Step into your <span className="text-gold">next story</span>
          </motion.h1>

          <motion.p {...rise(0.35)} className="mt-7 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
            Pre-loved sneakers and shoes, imported and graded into three honest tiers. Every pair is cleaned,
            checked and photographed as it really is.
          </motion.p>

          <motion.div {...rise(0.5)} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to={paths.collection('premium')} variant="accent" size="lg" className="shadow-glow">
              Shop Premium <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink to={paths.shop} variant="outline" size="lg" className="glass border-white/15">
              Browse all pairs
            </ButtonLink>
          </motion.div>

          <motion.ul {...rise(0.65)} className="mt-12 grid max-w-xl grid-cols-3 gap-3">
            {PROMISES.map(({ icon: Icon, label, sub }) => (
              <li key={label} className="glass rounded-2xl p-3 sm:p-4">
                <Icon className="size-5 text-sand" aria-hidden />
                <p className="mt-3 font-display text-xs font-semibold sm:text-sm">{label}</p>
                <p className="mt-0.5 text-[11px] text-ink-subtle sm:text-xs">{sub}</p>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: m.ease.outExpo, delay: 0.25 }}
          className="relative mx-auto w-full max-w-[540px]"
        >
          {/* Halo */}
          <div
            aria-hidden
            className="absolute -inset-4 rounded-full sm:-inset-8 bg-[radial-gradient(closest-side,rgb(230_201_131/0.35),rgb(92_112_214/0.25)_55%,transparent)] blur-2xl"
          />
          <div
            aria-hidden
            className="absolute -inset-[3px] rounded-t-[999px] rounded-b-[2.6rem] bg-gradient-to-b from-sand/80 via-orchid/50 to-aurora/40"
          />

          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2.5rem] bg-carbon ring-1 ring-white/15">
            <img
              src={unsplash(HERO_SHOWCASE_PHOTO.id, 1200)}
              srcSet={unsplashSrcSet(HERO_SHOWCASE_PHOTO.id, [600, 900, 1200, 1600])}
              sizes="(min-width: 1024px) 40vw, 90vw"
              alt={HERO_SHOWCASE_PHOTO.alt}
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-transparent" />
            <DemoTag label="Demo photography" className="absolute bottom-5 left-1/2 -translate-x-1/2" />
          </div>

          {/* Floating chips */}
          {featured && (
            <Link
              to={paths.product(featured.slug)}
              className="glass absolute top-[18%] -left-2 flex animate-float items-center gap-3 rounded-2xl p-2.5 pr-4 shadow-pop transition-colors hover:border-sand/50 sm:-left-10"
            >
              {featured.primaryImage && (
                <img src={featured.primaryImage.url} alt="" className="size-12 rounded-xl object-cover" />
              )}
              <span className="text-left">
                <span className="block font-display text-[10px] tracking-[0.22em] text-sand uppercase">
                  Premium pick
                </span>
                <span className="block max-w-[9rem] truncate text-sm font-medium">{featured.name}</span>
                <span className="block font-display text-xs text-ink-muted tabular-nums">
                  {formatPrice(featured.price)}
                </span>
              </span>
            </Link>
          )}
          <div
            className="glass absolute -right-2 bottom-[16%] flex animate-float items-center gap-3 rounded-2xl px-4 py-3 shadow-pop sm:-right-8"
            style={{ animationDelay: '-3.5s' }}
          >
            <span className="grid size-9 place-items-center rounded-full bg-sand text-night">
              <SparkleIcon className="size-4" />
            </span>
            <span>
              <span className="block font-display text-sm font-semibold">Graded by hand</span>
              <span className="block text-xs text-ink-subtle">Flaws shown, never hidden</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
