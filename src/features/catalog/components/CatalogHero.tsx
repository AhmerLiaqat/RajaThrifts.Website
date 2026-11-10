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
              'shrink-0 rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'border-sand bg-sand text-white'
                : 'border-line-strong bg-white text-ink-muted hover:border-ink-subtle hover:text-ink',
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
    <section className="relative isolate overflow-hidden border-b border-line bg-surface-sunken">
      {photo && (
        <>
          <motion.img
            key={photo.id}
            src={unsplash(photo.id, 1800)}
            srcSet={unsplashSrcSet(photo.id, [800, 1200, 1800, 2400])}
            sizes="100vw"
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: m.ease.outExpo }}
            className="absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 object-cover lg:block"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-r from-surface-sunken via-surface-sunken/60 to-transparent lg:block"
          />
        </>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex max-w-2xl flex-col gap-3">
          <div>
            <p className="eyebrow">
              {meta ? 'Collection' : 'The full rack'}
              {total != null && <span className="font-medium tracking-normal text-ink-subtle normal-case"> · {total} in stock</span>}
            </p>
            <h1
              key={title}
              className={cn(
                'mt-2 text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-4xl',
              )}
            >
              <MaskedText immediate lines={[{ text: title }]} />
            </h1>
          </div>
          <div className="max-w-lg">
            <p className="text-sm leading-relaxed text-ink-muted">
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
