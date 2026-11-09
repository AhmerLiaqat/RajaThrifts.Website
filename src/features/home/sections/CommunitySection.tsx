import { ArrowRight } from 'lucide-react'
import { paths } from '@/app/router/paths'
import { Reveal } from '@/components/motion/Reveal'
import { SparkleIcon, Sparkles } from '@/components/motion/Sparkles'
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
    <section id="instagram" aria-labelledby="community-title" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2d3c86] via-[#26336a] to-[#3a2f72] p-8 ring-1 ring-white/15 sm:p-12 lg:p-16">
            <div
              aria-hidden
              className="absolute -top-32 -right-24 size-96 rounded-full bg-orchid/40 blur-[110px]"
            />
            <Sparkles count={16} seed={99} />

            <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <span className="inline-flex items-center gap-2 font-display text-[11px] tracking-[0.28em] text-sand uppercase">
                  <SparkleIcon className="size-3" /> Follow the drops
                </span>
                <h2
                  id="community-title"
                  className="mt-5 text-[clamp(2.25rem,5vw,4rem)] leading-[1] font-semibold tracking-[-0.03em]"
                >
                  Never miss a <span className="text-gold">perfect pair</span>
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-bone/80">
                  One of each means the good ones go fast. New shipments are posted first on Instagram as{' '}
                  <span className="font-medium text-bone">@{INSTAGRAM_HANDLE}</span>.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <ButtonLink to={paths.shop} variant="accent" size="lg" className="shadow-glow">
                    Shop the rack <ArrowRight className="size-4" />
                  </ButtonLink>
                  {INSTAGRAM_URL ? (
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="glass inline-flex h-14 items-center gap-2 rounded-full px-6 font-display text-xs tracking-[0.2em] uppercase"
                    >
                      <InstagramGlyph className="size-4" /> Follow on Instagram
                    </a>
                  ) : (
                    <span className="glass inline-flex h-14 items-center gap-2 rounded-full px-6 font-display text-xs tracking-[0.2em] text-bone/85 uppercase">
                      <InstagramGlyph className="size-4" /> Instagram coming soon
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <ul className="grid grid-cols-3 gap-3">
                  {INSTAGRAM_PHOTOS.map((photo, i) => (
                    <li
                      key={photo.id}
                      className={i % 2 ? 'translate-y-6' : ''}
                    >
                      <div className="group relative aspect-square overflow-hidden rounded-2xl bg-carbon ring-1 ring-white/15">
                        <img
                          src={unsplash(photo.id, 500, 500)}
                          alt={photo.alt}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-110"
                        />
                        <span className="absolute inset-0 grid place-items-center bg-night/50 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                          <InstagramGlyph className="size-6 text-bone" />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <DemoTag label="Demo feed" className="absolute -bottom-10 left-0" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
