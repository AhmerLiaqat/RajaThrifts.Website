import { ArrowRight } from 'lucide-react'
import { paths } from '@/app/router/paths'
import { Reveal } from '@/components/motion/Reveal'
import { ButtonLink } from '@/components/ui'
import { DemoTag } from '@/components/ui/DemoTag'
import { INSTAGRAM_PHOTOS, unsplash } from '@/mocks/demo-media'

/**
 * Placeholder handle. Set INSTAGRAM_URL once the real account is confirmed;
 * until then nothing links out, so we never send visitors to someone else's profile.
 */
const INSTAGRAM_HANDLE = 'rajathrifs'
const INSTAGRAM_URL: string | null = null

/** Lucide 1.x dropped brand icons, so this is a minimal inline glyph. */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** COMMUNITY: a glowing call-to-action panel with the Instagram preview strip. */
export function CommunitySection() {
  return (
    <section id="instagram" aria-labelledby="community-title" className="relative pt-4 pb-16 lg:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-brand-navy p-8 text-white sm:p-12">

            <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <span className="text-xs font-semibold tracking-[0.12em] text-gold uppercase">Follow the drops</span>
                <h2
                  id="community-title"
                  className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight font-bold tracking-tight text-white"
                >
                  Never miss a <span className="text-gold">perfect pair</span>
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
                  One of each means the good ones go fast. New shipments are posted first on Instagram as{' '}
                  <span className="font-semibold text-white">@{INSTAGRAM_HANDLE}</span>.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <ButtonLink to={paths.shop} size="lg" className="bg-gold text-brand-navy hover:bg-gold/90">
                    Shop the rack <ArrowRight className="size-4" />
                  </ButtonLink>
                  {INSTAGRAM_URL ? (
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      <InstagramGlyph className="size-4" /> Follow on Instagram
                    </a>
                  ) : (
                    <span className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/20 px-5 text-sm font-medium text-white/70">
                      <InstagramGlyph className="size-4" /> Instagram coming soon
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <ul className="grid grid-cols-3 gap-3">
                  {INSTAGRAM_PHOTOS.map((photo) => (
                    <li
                      key={photo.id}
                    >
                      <div className="group relative aspect-square overflow-hidden rounded-xl bg-white/10">
                        <img
                          src={unsplash(photo.id, 500, 500)}
                          alt={photo.alt}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 grid place-items-center bg-brand-navy/50 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                          <InstagramGlyph className="size-6 text-white" />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <DemoTag label="Demo feed" className="absolute top-2 left-2" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
