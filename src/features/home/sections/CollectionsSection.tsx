import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Reveal } from '@/components/motion/Reveal'
import { DemoTag } from '@/components/ui/DemoTag'
import { COLLECTION_META } from '@/constants/collections'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/format'
import { COLLECTION_PHOTOS, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { HomeHeading } from '../components/HomeHeading'
import { useHomeProducts } from '../useHomeProducts'

/** Copy per tier. One visual style for all three, so no tier looks like a different site. */
const DETAIL = {
  PREMIUM: {
    kicker: 'The top tier',
    condition: 3,
    points: ['Near-new uppers & soles', 'Deep-cleaned and restored'],
    tint: 'from-[#5a4210]/95 via-[#8a6514]/55',
    chip: 'bg-gold text-brand-navy',
  },
  'A CATEGORY': {
    kicker: 'Everyday excellence',
    condition: 2,
    points: ['Light signs of wear', 'Ready for daily rotation'],
    tint: 'from-navy-950/95 via-navy-800/55',
    chip: 'bg-white text-brand-navy',
  },
  'B CATEGORY': {
    kicker: 'Honest value',
    condition: 1,
    points: ['Visible, disclosed wear', 'Priced for weekend miles'],
    tint: 'from-[#1f2937]/95 via-[#374151]/55',
    chip: 'bg-white text-ink',
  },
} as const

const collections = Object.values(COLLECTION_META).sort((a, b) => a.rank - b.rank)

/** SHOP BY GRADE: three photographic tiles, tinted per tier. */
export function CollectionsSection() {
  const { items, isPending, isDemo } = useHomeProducts()
  return (
    <section id="collections" aria-labelledby="collections-title" className="relative py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeHeading
          id="collections-title"
          eyebrow="Shop by grade"
          title="Pick your"
          highlight="grade"
          description="Every pair is graded by condition, then priced to match. Choose the tier that fits how you wear."
          action={
            <Link to={paths.shop} className="inline-flex items-center gap-1.5 text-sm font-semibold text-sand hover:underline">
              Compare all pairs <ArrowRight className="size-4" />
            </Link>
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {collections.map((c, i) => {
            const d = DETAIL[c.value]
            const inCollection = items.filter((p) => p.collection === c.value)
            const count = inCollection.filter((p) => p.totalStock > 0).length
            const from = inCollection.filter((p) => p.totalStock > 0).reduce<number | null>(
              (min, p) => (min == null || p.price < min ? p.price : min),
              null,
            )
            // Live mode: the newest real photo in this tier; demo photography only as a labelled fallback.
            const cover = isDemo ? null : inCollection.find((p) => p.primaryImage)?.primaryImage
            const photo = COLLECTION_PHOTOS[c.value]
            return (
              <Reveal key={c.slug} delay={i * 0.06}>
                <Link
                  to={paths.collection(c.slug)}
                  className="group relative isolate flex aspect-[5/4.4] flex-col justify-end overflow-hidden rounded-3xl bg-brand-navy p-6 text-white shadow-[0_20px_40px_-24px_rgb(17_26_51/0.6)] transition-transform duration-300 hover:-translate-y-1 md:aspect-[4/4.8]"
                >
                  <img
                    src={cover ? cover.url : unsplash(photo.id, 900)}
                    srcSet={cover ? undefined : unsplashSrcSet(photo.id, [600, 900, 1200])}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    alt={cover ? cover.alt : photo.alt}
                    loading="lazy"
                    className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                  />
                  <div aria-hidden className={cn('absolute inset-0 -z-10 bg-gradient-to-t to-transparent', d.tint)} />
                  {!cover && (
                    <DemoTag className="absolute top-5 right-5" label={isDemo ? 'Demo' : 'Demo photo'} />
                  )}

                  <span className={cn('absolute top-5 left-5 rounded-lg px-2.5 py-1 text-xs font-extrabold tracking-wide', d.chip)}>
                    {c.label}
                  </span>

                  <p className="text-xs font-semibold tracking-[0.12em] text-white/70 uppercase">{d.kicker}</p>
                  <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-white">{c.label}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">{c.tagline}</p>

                  <div className="mt-3 flex items-center gap-1.5" role="img" aria-label={`Condition ${d.condition} of 3`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={cn('h-1.5 w-7 rounded-full', n <= d.condition ? 'bg-gold' : 'bg-white/25')} />
                    ))}
                    <span className="ml-2 text-xs text-white/70">Condition</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
                    <span className="text-sm">
                      {isPending ? (
                        '…'
                      ) : count === 0 ? (
                        'New pairs soon'
                      ) : (
                        <>
                          <span className="font-bold">{count}</span> {count === 1 ? 'pair' : 'pairs'}
                          {from != null && (
                            <span className="text-white/70">
                              {' '}
                              · from <span className="font-semibold text-white">{formatPrice(from)}</span>
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-brand-navy transition-colors group-hover:bg-gold">
                      Shop <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
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
