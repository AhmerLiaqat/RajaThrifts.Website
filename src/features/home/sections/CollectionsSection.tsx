import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Reveal } from '@/components/motion/Reveal'
import { DemoTag } from '@/components/ui/DemoTag'
import { COLLECTION_META } from '@/constants/collections'
import { cn } from '@/lib/utils/cn'
import { DEMO_PRODUCTS, IS_DEMO_CATALOG } from '@/mocks/demo-catalog'
import { COLLECTION_PHOTOS, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { HomeHeading } from '../components/HomeHeading'

/** Copy per tier. One visual style for all three, so no tier looks like a different site. */
const DETAIL = {
  PREMIUM: { kicker: 'The top tier', condition: 3, points: ['Near-new uppers & soles', 'Deep-cleaned and restored'] },
  'A CATEGORY': { kicker: 'Everyday excellence', condition: 2, points: ['Light signs of wear', 'Ready for daily rotation'] },
  'B CATEGORY': { kicker: 'Honest value', condition: 1, points: ['Visible, disclosed wear', 'Priced for weekend miles'] },
} as const

const collections = Object.values(COLLECTION_META).sort((a, b) => a.rank - b.rank)

/** SHOP BY GRADE: three matching glass cards, one per collection. */
export function CollectionsSection() {
  return (
    <section id="collections" aria-labelledby="collections-title" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <HomeHeading
          id="collections-title"
          eyebrow="Shop by grade"
          title="Three tiers,"
          highlight="one standard"
          description="Every pair is graded by condition, then priced to match. Pick the tier that fits how you wear."
          center
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3 lg:mt-20 lg:gap-8">
          {collections.map((c, i) => {
            const d = DETAIL[c.value]
            const photo = COLLECTION_PHOTOS[c.value]
            const count = DEMO_PRODUCTS.filter((p) => p.collection === c.value).length
            return (
              <Reveal key={c.slug} delay={i * 0.1}>
                <Link
                  to={paths.collection(c.slug)}
                  className="glass group relative flex h-full flex-col overflow-hidden rounded-[2rem] p-3 transition-[border-color,box-shadow,transform] duration-500 ease-out-expo hover:-translate-y-1.5 hover:border-sand/40 hover:shadow-glow"
                >
                  <div className="relative aspect-[4/3.4] overflow-hidden rounded-[1.5rem] bg-carbon">
                    <img
                      src={unsplash(photo.id, 900)}
                      srcSet={unsplashSrcSet(photo.id, [600, 900, 1200])}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      alt={photo.alt}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.06]"
                    />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/10 to-transparent" />
                    <span className="absolute top-4 left-4 font-display text-xs text-bone/80 tabular-nums">
                      0{i + 1}
                    </span>
                    {IS_DEMO_CATALOG && <DemoTag className="absolute top-4 right-4" />}
                    <h3 className="absolute bottom-4 left-5 font-display text-3xl font-semibold tracking-tight text-bone">
                      {c.label}
                    </h3>
                  </div>

                  <div className="flex flex-1 flex-col px-3 pt-5 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[11px] tracking-[0.26em] text-sand uppercase">{d.kicker}</span>
                      <span
                        className="flex gap-1"
                        role="img"
                        aria-label={`Condition ${d.condition} of 3`}
                      >
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={cn('h-1.5 w-5 rounded-full', n <= d.condition ? 'bg-sand' : 'bg-bone/15')}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">{c.tagline}</p>
                    <ul className="mt-4 space-y-1.5 text-sm text-bone/85">
                      {d.points.map((pt) => (
                        <li key={pt} className="flex items-center gap-2">
                          <span className="size-1 rounded-full bg-sand" aria-hidden />
                          {pt}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex items-center justify-between pt-6">
                      <span className="text-xs text-ink-subtle">
                        {count} {IS_DEMO_CATALOG ? 'sample ' : ''}pairs
                      </span>
                      <span className="inline-flex items-center gap-2 font-display text-xs font-medium tracking-[0.2em] uppercase">
                        Shop
                        <span className="grid size-9 place-items-center rounded-full bg-bone/10 transition-colors duration-300 group-hover:bg-sand group-hover:text-night">
                          <ArrowUpRight className="size-4" />
                        </span>
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
