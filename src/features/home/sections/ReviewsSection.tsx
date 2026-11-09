import { Quote, Star } from 'lucide-react'
import { DemoTag } from '@/components/ui/DemoTag'
import { cn } from '@/lib/utils/cn'
import { SAMPLE_REVIEWS } from '@/mocks/demo-reviews'
import { HomeHeading } from '../components/HomeHeading'

type Review = (typeof SAMPLE_REVIEWS)[number]

function ReviewCard({ review, hidden }: { review: Review; hidden?: boolean }) {
  return (
    <figure
      aria-hidden={hidden || undefined}
      className="glass flex w-[82vw] shrink-0 flex-col justify-between gap-8 rounded-3xl p-7 sm:w-[400px]"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={cn('size-4', i < review.rating ? 'fill-sand text-sand' : 'text-bone/20')} />
            ))}
          </div>
          <Quote className="size-6 text-sand/40" aria-hidden />
        </div>
        <blockquote className="mt-5 font-display text-lg leading-snug font-medium tracking-tight">
          “{review.text}”
        </blockquote>
      </div>
      <figcaption className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-sand to-sand-600 font-display text-xs font-semibold text-night">
            {review.initials}
          </span>
          <span className="text-sm">
            <span className="block font-medium">{review.name}</span>
            <span className="block text-ink-subtle">{review.city}</span>
          </span>
        </span>
        <DemoTag label="Sample" />
      </figcaption>
    </figure>
  )
}

/** REVIEWS: two counter-scrolling rows. Content is explicitly sample-only until real reviews exist. */
export function ReviewsSection() {
  const rows = [SAMPLE_REVIEWS.slice(0, 3), SAMPLE_REVIEWS.slice(3)]

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <HomeHeading
          id="reviews-title"
          eyebrow="Word on the street"
          title="Worn &"
          highlight="loved"
          center
          description={
            <>
              <strong className="font-semibold text-bone">Layout preview:</strong> these are sample testimonials,
              not real customer reviews. Verified reviews replace them before launch.
            </>
          }
        />
      </div>

      <div className="mt-14 flex flex-col gap-5 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] lg:mt-16">
        {rows.map((row, ri) => (
          <div key={ri} className="flex overflow-hidden">
            <div
              className={cn(
                'flex w-max gap-5 pr-5 hover:[animation-play-state:paused]',
                ri ? 'animate-marquee-reverse' : 'animate-marquee',
              )}
            >
              {[...row, ...row, ...row, ...row].map((review, i) => (
                <ReviewCard key={i} review={review} hidden={i >= row.length} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
