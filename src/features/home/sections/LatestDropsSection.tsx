import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { paths } from '@/app/router/paths'
import { ButtonLink } from '@/components/ui'
import { COLLECTIONS, COLLECTION_META, type Collection } from '@/constants/collections'
import { ProductCard } from '@/features/catalog/components/ProductCard'
import { cn } from '@/lib/utils/cn'
import { ProductGridSkeleton } from '@/features/catalog/components/ProductGrid'
import { motion as m } from '@/theme/tokens'
import { HomeHeading } from '../components/HomeHeading'
import { useHomeProducts } from '../useHomeProducts'

const LIMIT = 8

type Tab = 'ALL' | Collection

/** LATEST DROPS: tabbed product grid filtered by collection. */
export function LatestDropsSection() {
  const [tab, setTab] = useState<Tab>('ALL')
  // Newest first (in-stock pairs before sold-out ones), straight from the catalog.
  const { items: all, isPending, error, isDemo, isNew } = useHomeProducts()
  const items = (tab === 'ALL' ? all : all.filter((p) => p.collection === tab)).slice(0, LIMIT)

  return (
    <section id="new-arrivals" aria-labelledby="drops-title" className="relative border-t border-line bg-surface-sunken py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeHeading
          id="drops-title"
          eyebrow="Fresh off the shipment"
          title="Latest"
          highlight="drops"
          description="One of each, so when a pair is gone, it is gone. New pairs land first."
          action={
            <ButtonLink to={paths.shop} variant="outline">
              See everything <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />

        <div
          role="tablist"
          aria-label="Filter by collection"
          className="no-scrollbar mt-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1 shadow-sm"
        >
          {(['ALL', ...COLLECTIONS] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'relative shrink-0 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                tab === t ? 'text-white' : 'text-ink-muted hover:text-ink',
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="drops-tab"
                  className="absolute inset-0 rounded-md bg-sand"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{t === 'ALL' ? 'All pairs' : COLLECTION_META[t].label}</span>
            </button>
          ))}
        </div>

        {isPending && (
          <div className="mt-8">
            <ProductGridSkeleton count={4} />
          </div>
        )}
        {error && <p className="mt-10 text-sm text-danger">Could not load pairs: {error.message}</p>}
        {!isPending && !error && items.length === 0 && (
          <p className="mt-8 rounded-xl border border-dashed border-line-strong bg-white p-10 text-center text-ink-muted">
            {tab === 'ALL' ? 'New pairs are on the way. Check back soon!' : `No ${COLLECTION_META[tab].label} pairs right now.`}
          </p>
        )}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: m.ease.outExpo, delay: i * 0.02 }}
                className="relative"
              >
                {isNew(p) && (
                  <span className="pointer-events-none absolute top-4.5 right-14 z-10 rounded-md bg-gold px-2 py-0.5 text-[11px] font-extrabold text-brand-navy uppercase shadow-sm">
                    New
                  </span>
                )}
                <ProductCard product={p} isDemo={isDemo} priority={i < 4} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
