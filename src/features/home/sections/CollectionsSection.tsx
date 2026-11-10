import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Reveal } from '@/components/motion/Reveal'
import { DemoTag } from '@/components/ui/DemoTag'
import { COLLECTION_META } from '@/constants/collections'
import { cn } from '@/lib/utils/cn'
import { COLLECTION_PHOTOS, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { HomeHeading } from '../components/HomeHeading'
import { useHomeProducts } from '../useHomeProducts'

/** Copy per tier. One visual style for all three, so no tier looks like a different site. */
const DETAIL = {
  PREMIUM: { kicker: 'The top tier', condition: 3, points: ['Near-new uppers & soles', 'Deep-cleaned and restored'] },
  'A CATEGORY': { kicker: 'Everyday excellence', condition: 2, points: ['Light signs of wear', 'Ready for daily rotation'] },
  'B CATEGORY': { kicker: 'Honest value', condition: 1, points: ['Visible, disclosed wear', 'Priced for weekend miles'] },
} as const

const collections = Object.values(COLLECTION_META).sort((a, b) => a.rank - b.rank)

/** SHOP BY GRADE: three matching glass cards, one per collection. */
export function CollectionsSection() {
  const { items, isPending, isDemo } = useHomeProducts()
  return (
    <section id="collections" aria-labelledby="collections-title" className="relative py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeHeading
          id="collections-title"
          eyebrow="Shop by grade"
          title="Three tiers,"
          highlight="one standard"
          description="Every pair is graded by condition, then priced to match. Pick the tier that fits how you wear."
          center
        />

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {collections.map((c, i) => {
            const d = DETAIL[c.value]
            const inCollection = items.filter((p) => p.collection === c.value)
            const count = inCollection.filter((p) => p.totalStock > 0).length
            // Live mode: the newest real photo in this tier; demo photography only as a labelled fallback.
            const cover = isDemo ? null : inCollection.find((p) => p.primaryImage)?.primaryImage
            const photo = COLLECTION_PHOTOS[c.value]
            const demoPhoto = !cover
            return (
              <Reveal key={c.slug} delay={i * 0.05}>
                <Link
                  to={paths.collection(c.slug)}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface-raised shadow-card transition-[border-color,box-shadow] duration-200 hover:border-sand/30 hover:shadow-glow"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-sunken">
                    <img
                      src={cover ? cover.url : unsplash(photo.id, 900)}
                      srcSet={cover ? undefined : unsplashSrcSet(photo.id, [600, 900, 1200])}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      alt={cover ? cover.alt : photo.alt}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {demoPhoto && <DemoTag className="absolute top-4 right-4" label={isDemo ? 'Demo' : 'Demo photo'} />}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-semibold text-sand">{d.kicker}</span>
                    <div className="mt-1 flex items-center justify-between">
                      <h3 className="text-xl font-bold tracking-tight text-ink">{c.label}</h3>
                      <span
                        className="flex gap-1"
                        role="img"
                        aria-label={`Condition ${d.condition} of 3`}
                      >
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={cn('h-1.5 w-5 rounded-full', n <= d.condition ? 'bg-gold' : 'bg-line')}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.tagline}</p>
                    <ul className="mt-4 mb-5 space-y-1.5 text-sm text-ink">
                      {d.points.map((pt) => (
                        <li key={pt} className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-sand" aria-hidden />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                      <span className="text-sm text-ink-subtle">
                        {isPending ? '…' : count === 0 ? 'New pairs soon' : `${count} ${isDemo ? 'sample ' : ''}${count === 1 ? 'pair' : 'pairs'} in stock`}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sand">
                        Shop
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
