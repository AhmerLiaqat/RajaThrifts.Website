import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { SAMPLE_REVIEWS } from '@/mocks/demo-reviews'
import { reviewService } from '@/services/reviews/review.service'
import type { CardReview } from './reviewCards'

export const SAMPLE_CARDS: CardReview[] = SAMPLE_REVIEWS.map((r, i) => ({
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
 * Published reviews (added by staff in Dashboard → Reviews) as cards, shared by the homepage
 * section and the /reviews page. Demo mode returns labelled samples.
 */
export function useReviewCards() {
  const live = !env.useDemoCatalog
  const reviews = useQuery({
    queryKey: ['reviews', 'published'],
    queryFn: reviewService.listPublished,
    enabled: live,
    staleTime: 5 * 60_000,
  })
  const cards: CardReview[] = live
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
    : SAMPLE_CARDS
  const average = cards.length ? cards.reduce((n, c) => n + c.rating, 0) / cards.length : 0
  return { cards, average, live, isPending: live && reviews.isPending, error: reviews.error }
}

/** Every third review card is navy so a row of reviews has rhythm. */
export const toneFor = (index: number): 'light' | 'dark' => (index % 3 === 1 ? 'dark' : 'light')
