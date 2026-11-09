import { Reveal } from '@/components/motion/Reveal'
import { DemoTag } from '@/components/ui/DemoTag'
import { cn } from '@/lib/utils/cn'
import { EDITORIAL_PHOTOS, unsplash, unsplashSrcSet } from '@/mocks/demo-media'
import { HomeHeading } from '../components/HomeHeading'

/** Bento placement: one feature tile (2×2) and four singles fill a 4×2 grid exactly. */
const LAYOUT = ['col-span-2 row-span-2', '', '', '', '']

/** LOOKBOOK: rounded bento grid of styled photography. */
export function LookbookSection() {
  return (
    <section id="editorial" aria-labelledby="lookbook-title" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <HomeHeading
          id="lookbook-title"
          eyebrow="Lookbook"
          title="Styled with"
          highlight="intent"
          description={
            <>
              How second-hand looks when it is worn well, on the street and in the studio.{' '}
              <DemoTag className="ml-1 align-middle" label="Demo photography" />
            </>
          }
        />

        <div className="mt-14 grid auto-rows-[minmax(160px,22vw)] grid-cols-2 gap-4 lg:mt-16 lg:auto-rows-[minmax(200px,15vw)] lg:grid-cols-4 lg:gap-5">
          {EDITORIAL_PHOTOS.map((photo, i) => (
            <Reveal
              key={photo.id}
              delay={i * 0.06}
              className={cn('group relative overflow-hidden rounded-[1.75rem] bg-carbon ring-1 ring-white/10', LAYOUT[i % LAYOUT.length])}
            >
              <img
                src={unsplash(photo.id, 1200)}
                srcSet={unsplashSrcSet(photo.id, [600, 900, 1200])}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={photo.alt}
                loading="lazy"
                className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-out-expo group-hover:scale-[1.06]"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night/75 via-transparent to-transparent" />
              <span className="glass absolute bottom-4 left-4 rounded-full px-3 py-1 font-display text-[10px] tracking-[0.24em] text-bone uppercase">
                {photo.caption}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
