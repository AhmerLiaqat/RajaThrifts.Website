import { useQuery } from '@tanstack/react-query'
import { Quote, Star } from 'lucide-react'
import { WhatsAppGlyph } from '@/components/feedback/WhatsAppFloat'
import { DemoTag } from '@/components/ui/DemoTag'
import { env } from '@/config/env'
import { cn } from '@/lib/utils/cn'
import { SAMPLE_REVIEWS } from '@/mocks/demo-reviews'
import { REVIEW_SOURCE_LABEL, reviewService, type ReviewSource } from '@/services/reviews/review.service'
import { HomeHeading } from '../components/HomeHeading'

/** One shape for real reviews and the demo samples. */
interface CardReview {
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

function ReviewCard({ review, hidden }: { review: CardReview; hidden?: boolean }) {
  return (
    <figure
      aria-hidden={hidden || undefined}
      className="flex w-[82vw] shrink-0 flex-col justify-between gap-5 rounded-xl border border-line bg-white p-6 shadow-card sm:w-[380px]"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={cn('size-4', i < review.rating ? 'fill-gold text-gold' : 'text-line-strong')} />
            ))}
          </div>
          {review.source === 'whatsapp' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/15 px-2.5 py-1 text-xs text-[#128C4A]">
              <WhatsAppGlyph className="size-3.5" /> via WhatsApp
            </span>
          ) : review.source ? (
            <span className="text-xs text-ink-subtle">via {REVIEW_SOURCE_LABEL[review.source]}</span>
          ) : (
            <Quote className="size-6 text-sand/25" aria-hidden />
          )}
        </div>
        <blockquote className="mt-4 line-clamp-6 text-base leading-relaxed text-ink">
          “{review.text}”
        </blockquote>
        {review.imageUrl && (
          <a href={review.imageUrl} target="_blank" rel="noreferrer" tabIndex={hidden ? -1 : undefined} className="mt-4 inline-block">
            <img src={review.imageUrl} alt="Screenshot of the customer's message" loading="lazy" className="h-24 w-20 rounded-lg object-cover ring-1 ring-line" />
          </a>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-sand-100 text-xs font-bold text-sand">
            {initials(review.name)}
          </span>
          <span className="text-sm">
            <span className="block font-semibold text-ink">{review.name}</span>
            {review.city && <span className="block text-ink-subtle">{review.city}</span>}
          </span>
        </span>
        {review.sample && <DemoTag label="Sample" />}
      </figcaption>
    </figure>
  )
}

const SAMPLES: CardReview[] = SAMPLE_REVIEWS.map((r, i) => ({
  key: `sample-${i}`,
  name: r.name,
  city: r.city,
  rating: r.rating,
  text: r.text,
  source: null,
  imageUrl: null,
  sample: true,
}))

/**
 * REVIEWS: real reviews added by staff in Dashboard → Reviews. Demo mode shows labelled
 * samples; live mode with no reviews hides the section rather than show fake ones.
 */
export function ReviewsSection() {
  const live = !env.useDemoCatalog
  const reviews = useQuery({
    queryKey: ['reviews', 'published'],
    queryFn: reviewService.listPublished,
    enabled: live,
    staleTime: 5 * 60_000,
  })

  const list: CardReview[] = live
    ? (reviews.data ?? []).map((r) => ({
        key: r.id,
        name: r.customerName,
        city: r.city,
        rating: r.rating,
        text: r.body,
        source: r.source,
        imageUrl: r.imageUrl,
        sample: false,
      }))
    : SAMPLES
  if (list.length === 0) return null

  // Two counter-scrolling rows once there are enough cards; one row otherwise.
  const rows = list.length >= 6 ? [list.filter((_, i) => i % 2 === 0), list.filter((_, i) => i % 2 === 1)] : [list]
  const repeat = (row: CardReview[]) => Array.from({ length: Math.max(2, Math.ceil(8 / row.length)) }, () => row).flat()

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="relative overflow-hidden py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeHeading
          id="reviews-title"
          eyebrow="Word on the street"
          title="Worn &"
          highlight="loved"
          center
          description={
            live ? (
              'Messages from customers, shared with their permission.'
            ) : (
              <>
                <strong className="font-semibold text-bone">Layout preview:</strong> these are sample testimonials,
                not real customer reviews.
              </>
            )
          }
        />
      </div>

      <div className="mt-10 flex flex-col gap-5 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
        {rows.map((row, ri) => (
          <div key={ri} className="flex overflow-hidden">
            <div
              className={cn(
                'flex w-max gap-5 pr-5 hover:[animation-play-state:paused]',
                ri ? 'animate-marquee-reverse' : 'animate-marquee',
              )}
            >
              {repeat(row).map((review, i) => (
                <ReviewCard key={`${review.key}-${i}`} review={review} hidden={i >= row.length} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
