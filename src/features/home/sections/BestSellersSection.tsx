import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Reveal } from '@/components/motion/Reveal'
import { Sparkles } from '@/components/motion/Sparkles'
import { DemoTag } from '@/components/ui/DemoTag'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { formatPrice } from '@/lib/utils/format'
import { DEMO_BEST_SELLERS } from '@/mocks/demo-catalog'
import { HomeHeading } from '../components/HomeHeading'

/** BEST SELLERS: a spotlight on #1 beside a ranked glass list. */
export function BestSellersSection() {
  const [top, ...rest] = DEMO_BEST_SELLERS

  return (
    <section id="best-sellers" aria-labelledby="best-title" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <HomeHeading
          id="best-title"
          eyebrow="Most wanted"
          title="Best"
          highlight="sellers"
          description={
            <>
              The silhouettes that move fastest. <DemoTag className="ml-1 align-middle" label="Sample ranking" />
            </>
          }
        />

        <div className="mt-14 grid gap-6 lg:mt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
          {top && (
            <Reveal>
              <Link
                to={paths.product(top.slug)}
                className="glass group relative flex h-full min-h-[420px] flex-col justify-end overflow-hidden rounded-[2rem] p-6 transition-shadow duration-500 hover:shadow-glow sm:p-8"
              >
                {top.primaryImage && (
                  <img
                    src={top.primaryImage.url}
                    alt={top.primaryImage.alt}
                    loading="lazy"
                    className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-out-expo group-hover:scale-105"
                  />
                )}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
                <Sparkles count={8} seed={11} />
                <span className="absolute top-6 left-6 grid size-14 place-items-center rounded-full bg-sand font-display text-lg font-semibold text-night shadow-glow">
                  #1
                </span>
                <div className="relative">
                  <CollectionBadge collection={top.collection} variant="solid" />
                  <p className="mt-4 font-display text-[11px] tracking-[0.26em] text-bone/70 uppercase">{top.brand}</p>
                  <h3 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{top.name}</h3>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-display text-xl text-gold tabular-nums">{formatPrice(top.price)}</span>
                    <span className="grid size-12 place-items-center rounded-full bg-bone text-night transition-colors group-hover:bg-sand">
                      <ArrowUpRight className="size-5" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          )}

          <ol className="flex min-w-0 flex-col gap-4">
            {rest.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={i * 0.08}>
                  <Link
                    to={paths.product(p.slug)}
                    className="glass group flex items-center gap-4 rounded-3xl p-3 pr-5 transition-[border-color,transform] duration-500 ease-out-expo hover:translate-x-1 hover:border-sand/40 sm:gap-5"
                  >
                    <span className="w-8 shrink-0 text-center font-display text-lg text-sand tabular-nums">
                      {String(i + 2).padStart(2, '0')}
                    </span>
                    {p.primaryImage && (
                      <img
                        src={p.primaryImage.url}
                        alt=""
                        loading="lazy"
                        className="size-20 shrink-0 rounded-2xl object-cover sm:size-24"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[10px] tracking-[0.26em] text-ink-subtle uppercase">
                        {p.brand}
                      </span>
                      <span className="mt-1 block truncate font-display text-base font-medium sm:text-lg">{p.name}</span>
                      <span className="mt-2 flex items-center gap-3">
                        <CollectionBadge collection={p.collection} />
                        <span className="font-display text-sm tabular-nums">{formatPrice(p.price)}</span>
                      </span>
                    </span>
                    <ArrowUpRight className="hidden size-5 shrink-0 text-ink-subtle transition-colors group-hover:text-sand sm:block" />
                  </Link>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
