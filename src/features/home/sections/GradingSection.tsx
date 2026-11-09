import { PackageSearch, ScanSearch, SprayCan } from 'lucide-react'
import { Reveal } from '@/components/motion/Reveal'
import { Sparkles } from '@/components/motion/Sparkles'
import { STORY_PHOTO, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { HomeHeading } from '../components/HomeHeading'

/** Brand copy lives here so it is easy for the business to edit. */
const STEPS = [
  {
    icon: PackageSearch,
    title: 'Sourced',
    body: 'Imported in mixed shipments from abroad, then sorted pair by pair.',
  },
  {
    icon: ScanSearch,
    title: 'Graded',
    body: 'Each pair is placed in PREMIUM, A CATEGORY or B CATEGORY by its condition.',
  },
  {
    icon: SprayCan,
    title: 'Restored',
    body: 'Cleaned, deodorised and photographed as-is. Flaws are shown, never hidden.',
  },
]

/** OUR STORY / HOW IT WORKS: glass step cards beside a glowing photo. */
export function GradingSection() {
  return (
    <section id="story" aria-labelledby="story-title" className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-10">
        <Reveal className="relative order-last lg:order-first">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(139_111_214/0.35),transparent)] blur-2xl"
          />
          <figure className="relative aspect-[4/4.6] overflow-hidden rounded-[2.5rem] ring-1 ring-white/15">
            <img
              src={unsplash(STORY_PHOTO.id, 1200)}
              srcSet={unsplashSrcSet(STORY_PHOTO.id, [600, 900, 1200])}
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={STORY_PHOTO.alt}
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
            <Sparkles count={7} seed={23} />
            <figcaption className="glass absolute inset-x-5 bottom-5 rounded-2xl p-5">
              <p className="font-display text-lg leading-snug font-medium">
                “Every pair has already lived a chapter somewhere else. The next one is yours.”
              </p>
              <p className="mt-2 font-display text-[10px] tracking-[0.26em] text-bone/60 uppercase">
                Demo photography
              </p>
            </figcaption>
          </figure>
        </Reveal>

        <div>
          <HomeHeading
            id="story-title"
            eyebrow="Our story"
            title="Thrift, done"
            highlight="properly"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-muted">
              We import pre-loved pairs, inspect them by hand, restore what can be restored and grade the rest
              honestly. What you see in the photos is what arrives at your door.
            </p>
          </Reveal>

          <ol className="mt-10 flex flex-col gap-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <Reveal delay={0.1 + i * 0.08}>
                  <div className="glass flex items-start gap-5 rounded-3xl p-5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sand to-sand-600 text-night">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-display text-[11px] tracking-[0.26em] text-sand uppercase">Step 0{i + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
