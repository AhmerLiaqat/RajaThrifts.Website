import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { paths } from '@/app/router/paths'
import { ButtonLink } from '@/components/ui'
import { COLLECTIONS, COLLECTION_META, type Collection } from '@/constants/collections'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { cn } from '@/lib/utils/cn'
import {
  DEMO_A_CATEGORY,
  DEMO_B_CATEGORY,
  DEMO_NEW_ARRIVALS,
  DEMO_PREMIUM,
  IS_DEMO_CATALOG,
} from '@/mocks/demo-catalog'
import { motion as m } from '@/theme/tokens'
import { HomeHeading } from '../components/HomeHeading'

/** Newest first, then the rest of each collection. The lists are disjoint. */
const POOL = [...DEMO_NEW_ARRIVALS, ...DEMO_PREMIUM, ...DEMO_A_CATEGORY, ...DEMO_B_CATEGORY]
const LIMIT = 8

type Tab = 'ALL' | Collection

/** LATEST DROPS: tabbed product grid filtered by collection. */
export function LatestDropsSection() {
  const [tab, setTab] = useState<Tab>('ALL')
  const items = (tab === 'ALL' ? POOL : POOL.filter((p) => p.collection === tab)).slice(0, LIMIT)
  const newIds = new Set(DEMO_NEW_ARRIVALS.map((p) => p.id))

  return (
    <section id="new-arrivals" aria-labelledby="drops-title" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <HomeHeading
          id="drops-title"
          eyebrow="Fresh off the shipment"
          title="Latest"
          highlight="drops"
          description="One of each, so when a pair is gone, it is gone. New pairs land first."
          action={
            <ButtonLink to={paths.shop} variant="outline" className="glass border-white/15">
              See everything <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />

        <div
          role="tablist"
          aria-label="Filter by collection"
          className="glass no-scrollbar mt-10 inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5"
        >
          {(['ALL', ...COLLECTIONS] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'relative shrink-0 rounded-full px-5 py-2.5 font-display text-[11px] font-medium tracking-[0.2em] whitespace-nowrap uppercase transition-colors',
                tab === t ? 'text-night' : 'text-ink-muted hover:text-bone',
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="drops-tab"
                  className="absolute inset-0 rounded-full bg-sand"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{t === 'ALL' ? 'All pairs' : COLLECTION_META[t].label}</span>
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: m.ease.outExpo, delay: i * 0.03 }}
                className="relative"
              >
                {newIds.has(p.id) && (
                  <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-sand px-2.5 py-0.5 font-display text-[10px] font-semibold tracking-[0.2em] text-night uppercase shadow-glow">
                    New
                  </span>
                )}
                <ProductCard product={p} isDemo={IS_DEMO_CATALOG} priority={i < 4} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
