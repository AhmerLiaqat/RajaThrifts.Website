import { Expand, MapPin, Quote, Star } from 'lucide-react'
import { useCallback, useState } from 'react'
import { WhatsAppGlyph } from '@/components/feedback/WhatsAppFloat'
import { DemoTag } from '@/components/ui/DemoTag'
import { ImageLightbox } from '@/features/catalog/components/product/ImageLightbox'
import { cn } from '@/lib/utils/cn'
import { REVIEW_SOURCE_LABEL, type ReviewSource } from '@/services/reviews/review.service'

/** One shape for real reviews and the demo samples. */
export interface CardReview {
  key: string
  name: string
  city: string | null
  rating: number
  text: string
  source: ReviewSource | null
  imageUrl: string | null
  sample: boolean
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

const noop = () => {}

/** Brand-safe avatar gradients; each customer always gets the same one. */
const AVATARS = [
  'from-[#1b2550] to-[#3448b0]',
  'from-[#c99a2e] to-[#e8c063]',
  'from-[#16215a] to-[#24358a]',
  'from-[#0f766e] to-[#14b8a6]',
  'from-[#9a3412] to-[#ea580c]',
]
const avatarFor = (name: string) => AVATARS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATARS.length]

/**
 * A review styled as a shoe-box tag: gold quote medallion, the message, a perforated tear line,
 * then who said it. `className` sets the width (fixed in the homepage strip, fluid in the grid).
 */
export function ReviewCard({
  review,
  hidden,
  className,
  tone = 'light',
}: {
  review: CardReview
  hidden?: boolean
  className?: string
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  const [viewing, setViewing] = useState(false)
  const closeViewer = useCallback(() => setViewing(false), [])
  return (
    <>
    <figure
      aria-hidden={hidden || undefined}
      className={cn(
        'group relative mt-6 flex flex-col rounded-2xl border transition-all duration-300 hover:-translate-y-1',
        dark
          ? 'hero-navy border-white/10 text-white shadow-[0_24px_50px_-28px_rgb(12_18_48/0.8)]'
          : 'border-line bg-white text-ink shadow-card hover:border-gold/50 hover:shadow-[0_24px_50px_-28px_rgb(201_154_46/0.55)]',
        className,
      )}
    >
      {/* Gold top edge */}
      <span
        aria-hidden
        className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r from-transparent via-gold to-transparent opacity-80"
      />

      {/* Quote medallion, half outside the card */}
      <span
        aria-hidden
        className={cn(
          'absolute -top-6 left-6 grid size-12 place-items-center rounded-2xl shadow-lg ring-4 transition-transform duration-300 group-hover:-rotate-6',
          dark ? 'bg-gold text-brand-navy ring-brand-navy' : 'bg-brand-navy text-gold ring-white',
        )}
      >
        <Quote className="size-5 fill-current" />
      </span>

      <div className="flex flex-1 flex-col px-6 pt-9 pb-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  aria-hidden
                  className={cn(
                    'size-4',
                    i < review.rating ? 'fill-gold text-gold' : dark ? 'text-white/25' : 'text-line-strong',
                  )}
                />
              ))}
            </span>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums',
                dark ? 'bg-white/10 text-white' : 'bg-gold-soft text-[#8a6416]',
              )}
            >
              {review.rating.toFixed(1)}
            </span>
          </span>
          {review.source === 'whatsapp' ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                dark ? 'bg-[#25D366]/20 text-[#7ef0a9]' : 'bg-[#25D366]/12 text-[#128C4A]',
              )}
            >
              <WhatsAppGlyph className="size-3.5" /> WhatsApp
            </span>
          ) : review.source ? (
            <span className={cn('text-xs font-medium', dark ? 'text-white/70' : 'text-ink-subtle')}>
              via {REVIEW_SOURCE_LABEL[review.source]}
            </span>
          ) : null}
        </div>

        <blockquote
          className={cn(
            'mt-4 text-[15px] leading-relaxed whitespace-pre-line sm:text-base',
            dark ? 'text-white/90' : 'text-ink',
          )}
        >
          {review.text}
        </blockquote>

        {review.imageUrl && (
          <button
            type="button"
            onClick={() => setViewing(true)}
            tabIndex={hidden ? -1 : undefined}
            aria-label={`View ${review.name}'s message screenshot full size`}
            className={cn(
              'group/photo relative mt-4 block overflow-hidden rounded-xl p-1.5 text-left shadow-md transition-shadow hover:shadow-lg',
              dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-surface-sunken ring-1 ring-line',
            )}
          >
            <img
              src={review.imageUrl}
              alt={`Message from ${review.name}`}
              loading="lazy"
              className="h-56 w-full rounded-lg object-cover object-top transition-transform duration-500 group-hover/photo:scale-[1.03] sm:h-64"
            />
            {/* Fade + label so it reads as "tap to see the full message" */}
            <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-end justify-between rounded-b-lg bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pt-10 pb-2.5">
              <span className="text-xs font-semibold text-white">Customer's message</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow">
                <Expand className="size-3.5" aria-hidden /> View
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Perforated tear line with ticket notches */}
      <div aria-hidden className="relative h-0">
        <span
          className={cn(
            'absolute top-0 -left-px size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-surface',
            dark ? 'border-white/10' : 'border-line',
          )}
        />
        <span
          className={cn(
            'absolute top-0 -right-px size-5 translate-x-1/2 -translate-y-1/2 rounded-full border bg-surface',
            dark ? 'border-white/10' : 'border-line',
          )}
        />
        <span
          className={cn('absolute inset-x-5 top-0 border-t-2 border-dashed', dark ? 'border-white/15' : 'border-line')}
        />
      </div>

      <figcaption className="flex items-center justify-between gap-3 px-6 pt-4 pb-5">
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-white ring-2',
              avatarFor(review.name),
              dark ? 'ring-gold/60' : 'ring-gold/40',
            )}
          >
            {initials(review.name)}
          </span>
          <span className="min-w-0 text-sm">
            <span className={cn('block truncate font-semibold', dark ? 'text-white' : 'text-ink')}>{review.name}</span>
            {review.city && (
              <span className={cn('flex items-center gap-1 truncate text-xs', dark ? 'text-white/65' : 'text-ink-subtle')}>
                <MapPin className="size-3 shrink-0" aria-hidden /> {review.city}
              </span>
            )}
          </span>
        </span>

        {review.sample && <DemoTag label="Sample" />}
      </figcaption>
    </figure>
    {review.imageUrl && (
      <ImageLightbox
        open={viewing}
        images={[{ id: review.key, url: review.imageUrl, alt: `Message from ${review.name}` }]}
        index={0}
        onIndexChange={noop}
        onClose={closeViewer}
      />
    )}
    </>
  )
}

/** Five stars, filled up to `rating` (rounded). */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const full = Math.round(rating)
  return (
    <span className="flex gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={cn('size-4', className, i < full ? 'fill-gold text-gold' : 'text-line-strong')} />
      ))}
    </span>
  )
}
