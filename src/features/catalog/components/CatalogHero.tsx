import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { MaskedText } from '@/components/motion/MaskedText'
import { DemoTag } from '@/components/ui/DemoTag'
import { COLLECTION_META, type CollectionMeta } from '@/constants/collections'
import { cn } from '@/lib/utils/cn'
import { COLLECTION_PHOTOS, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { motion as m } from '@/theme/tokens'

const TABS = [
  { to: paths.shop, label: 'All' },
  ...Object.values(COLLECTION_META)
    .sort((a, b) => a.rank - b.rank)
    .map((c) => ({ to: paths.collection(c.slug), label: c.label })),
]

/** Collection switcher that keeps the current search term when changing scope. */
export function CollectionTabs() {
  const { search } = useLocation()
  const q = new URLSearchParams(search).get('q')
  const suffix = q ? `?q=${encodeURIComponent(q)}` : ''

  return (
    <nav
      aria-label="Collections"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={`${t.to}${suffix}`}
          end
          className={({ isActive }) =>
            cn(
              'shrink-0 rounded-full border px-4 py-2 font-display text-[11px] tracking-[0.2em] whitespace-nowrap uppercase transition-colors',
              isActive
                ? 'border-bone bg-bone text-night'
                : 'border-bone/15 text-bone/70 hover:border-bone/40 hover:text-bone',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

interface CatalogHeroProps {
  meta?: CollectionMeta
  total?: number
  isDemo?: boolean
}

/** Cinematic banner: photographic for collections, typographic for Shop All. */
export function CatalogHero({ meta, total, isDemo }: CatalogHeroProps) {
  const photo = meta ? COLLECTION_PHOTOS[meta.value] : null
  const title = meta?.label ?? 'Shop all'

  return (
    <section className="grain relative isolate overflow-hidden border-b border-bone/10">
      {photo && (
        <>
          <motion.img
            key={photo.id}
            src={unsplash(photo.id, 1800)}
            srcSet={unsplashSrcSet(photo.id, [800, 1200, 1800, 2400])}
            sizes="100vw"
            alt=""
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: m.ease.outExpo }}
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/75 to-night/40"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-night/80 to-transparent" />
        </>
      )}

      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pt-16 pb-10 sm:px-6 lg:px-10 lg:pt-28 lg:pb-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-sand" aria-hidden />
              {meta ? 'Collection' : 'The full rack'}
              {total != null && <span className="text-ink-muted">· {total} in stock</span>}
            </p>
            <h1
              key={title}
              className={cn(
                'mt-5 text-[clamp(3rem,10vw,9rem)] leading-[0.86] font-semibold tracking-[-0.04em] uppercase',
                meta?.value === 'PREMIUM' && 'text-sand',
              )}
            >
              <MaskedText immediate lines={[{ text: title }]} />
            </h1>
          </div>
          <div className="max-w-sm">
            <p className="text-sm leading-relaxed text-bone/75">
              {meta?.tagline ??
                'Every pair in stock across PREMIUM, A CATEGORY and B CATEGORY. Filter by brand, size, price and availability.'}
            </p>
            {isDemo && <DemoTag className="mt-4" label="Sample listings" />}
          </div>
        </div>
        <CollectionTabs />
      </div>
    </section>
  )
}
