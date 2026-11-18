import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { cn } from '@/lib/utils/cn'
import { ReviewCard, Stars, type CardReview } from '@/features/reviews/reviewCards'
import { toneFor, useReviewCards } from '@/features/reviews/useReviewCards'
import { HomeHeading } from '../components/HomeHeading'

/** How many reviews the homepage shows; the rest are on the /reviews page. */
const HOME_LIMIT = 5

/**
 * REVIEWS: the first 5 published reviews in one scrolling row, the total count and average
 * rating, and a link to every review. Demo mode shows labelled samples; live mode with no
 * reviews hides the section rather than show fake ones.
 */
export function ReviewsSection() {
  const { cards, average, live } = useReviewCards()
  if (cards.length === 0) return null

  const list = cards.slice(0, HOME_LIMIT)
  const total = cards.length
  // A single scrolling row.
  const rows = [list]
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
        <div className="mt-5 flex items-center justify-center gap-3 text-sm text-ink-muted">
          <Stars rating={average} />
          <span>
            <span className="font-bold text-ink tabular-nums">{average.toFixed(1)}</span> from{' '}
            <span className="font-bold text-ink tabular-nums">{total}</span> {total === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
        {rows.map((row, ri) => (
          <div key={ri} className="flex overflow-hidden">
            <div
              className={cn(
                'flex w-max items-start gap-5 pr-5 hover:[animation-play-state:paused]',
                ri ? 'animate-marquee-reverse' : 'animate-marquee',
              )}
            >
              {repeat(row).map((review, i) => (
                <ReviewCard
                  key={`${review.key}-${i}`}
                  review={review}
                  hidden={i >= row.length}
                  tone={toneFor((i % row.length) + ri)}
                  className="w-[82vw] shrink-0 sm:w-[380px]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center px-4">
        <Link
          to={paths.reviews}
          className="group inline-flex h-12 items-center gap-2 rounded-xl bg-brand-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-gold hover:text-brand-navy"
        >
          See all {total} {total === 1 ? 'review' : 'reviews'}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
