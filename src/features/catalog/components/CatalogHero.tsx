import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { MaskedText } from '@/components/motion/MaskedText'
import { DemoTag } from '@/components/ui/DemoTag'
import { COLLECTION_META, type CollectionMeta } from '@/constants/collections'
import { cn } from '@/lib/utils/cn'
import { COLLECTION_PHOTOS, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { motion as m } from '@/theme/tokens'
import { COLLECTION_SEO } from '@/lib/seo/copy'
import type { Audience } from '@/types/product'

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
                ? 'border-gold bg-gold font-semibold text-brand-navy'
                : 'border-white/20 bg-white/5 text-white/85 hover:bg-white/15 hover:text-white',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Shop page copy when a "Shop for" option is picked from the menu or filters. */
const AUDIENCE_HERO: Record<Audience, { title: string; tagline: string }> = {
  women: {
    title: 'Women',
    tagline: 'Women’s, kids’ and unisex pairs, every size. Filter by brand, size, price and availability.',
  },
  kids: {
    title: 'Kids',
    tagline: 'Kids’, women’s and unisex pairs in sizes under EU 41 / UK 7. Filter by brand, size, price and availability.',
  },
  men: {
    title: 'Men',
    tagline: 'Men’s and unisex pairs. Filter by brand, size, price and availability.',
  },
}

interface CatalogHeroProps {
  meta?: CollectionMeta
  /** Active "Shop for" choice on the shop page. */
  audience?: Audience | null
  /** Name of the active shoe type (category), e.g. "Hiking". */
  typeName?: string | null
  total?: number
  isDemo?: boolean
}

/** Cinematic banner: photographic for collections, typographic for Shop All. */
export function CatalogHero({ meta, audience, typeName, total, isDemo }: CatalogHeroProps) {
  const photo = meta ? COLLECTION_PHOTOS[meta.value] : null
  const forAudience = !meta && audience ? AUDIENCE_HERO[audience] : null
  const forType = !meta && typeName ? typeName : null
  // e.g. "Hiking", "Women", or "Women · Hiking" when both are picked.
  const title =
    meta?.label ?? ([forAudience?.title, forType].filter(Boolean).join(' · ') || 'Shop all')
  const typeTagline = forType
    ? `${forType} shoes, every pair hand-inspected and graded. Filter by brand, size, price and availability.`
    : null

  return (
    <section className="hero-navy relative isolate overflow-hidden text-white">
      <div aria-hidden className="dot-grid absolute inset-0 -z-10 opacity-50" />
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
            className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-r from-[#141c45] via-[#141c45]/60 to-transparent lg:block"
          />
        </>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex max-w-2xl flex-col gap-3">
          <div>
            <p className="eyebrow text-gold">
              {meta ? 'Collection' : 'The full rack'}
              {total != null && <span className="font-medium tracking-normal text-white/70 normal-case"> · {total} in stock</span>}
            </p>
            <h1
              key={title}
              className={cn(
                'mt-2 text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-5xl',
              )}
            >
              <MaskedText immediate lines={[{ text: title }]} />
            </h1>
          </div>
          <div className="max-w-lg">
            <p className="text-sm leading-relaxed text-white/75 sm:text-base">
              {(meta && COLLECTION_SEO[meta.slug]?.intro) ??
                forAudience?.tagline ??
                typeTagline ??
                'Branded thrift shoes in Pakistan: every imported pair in stock across PREMIUM, A CATEGORY and B CATEGORY. Filter by brand, size, price and availability.'}
            </p>
            {isDemo && <DemoTag className="mt-4" label="Sample listings" />}
          </div>
        </div>
        <CollectionTabs />
      </div>
    </section>
  )
}
