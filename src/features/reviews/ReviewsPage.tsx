import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { PageLoader } from '@/components/feedback/PageLoader'
import { SITE_NAME } from '@/lib/seo/copy'
import { useSeo } from '@/lib/seo/useSeo'
import { ReviewCard, Stars } from './reviewCards'
import { toneFor, useReviewCards } from './useReviewCards'

/** Every published customer review (pinned ones first, then newest). */
export default function ReviewsPage() {
  const { cards, average, live, isPending, error } = useReviewCards()
  const total = cards.length

  useSeo({
    title: 'Customer Reviews',
    description: `Read ${total ? `${total} ` : ''}reviews from ${SITE_NAME} customers across Pakistan: real messages about our branded thrift sneakers, grading and delivery.`,
    path: paths.reviews,
  })

  if (isPending) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-subtle">
        <Link to={paths.home} className="hover:text-ink">
          Home
        </Link>{' '}
        › <span className="text-ink">Reviews</span>
      </nav>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Customer reviews</h1>
          <p className="mt-2 text-ink-muted">
            {live
              ? 'Messages from customers, shared with their permission.'
              : 'Layout preview: these are sample testimonials, not real customer reviews.'}
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3 self-start rounded-xl border border-line bg-white px-4 py-3 sm:self-auto">
            <span className="text-3xl font-extrabold text-ink tabular-nums">{average.toFixed(1)}</span>
            <span className="text-sm text-ink-muted">
              <Stars rating={average} />
              <span className="mt-0.5 block">
                {total} {total === 1 ? 'review' : 'reviews'}
              </span>
            </span>
          </div>
        )}
      </header>

      {error ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-danger/30 px-6 py-16 text-center">
          <AlertTriangle className="size-7 text-danger" aria-hidden />
          <p className="mt-4 text-ink">We couldn’t load reviews right now. Please try again later.</p>
        </div>
      ) : total === 0 ? (
        <p className="mt-10 text-ink-muted">No reviews yet.</p>
      ) : (
        <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {cards.map((review, i) => (
            <ReviewCard key={review.key} review={review} tone={toneFor(i)} className="mb-2 break-inside-avoid" />
          ))}
        </div>
      )}
    </div>
  )
}
