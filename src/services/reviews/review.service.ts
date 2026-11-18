import { getSupabase } from '@/lib/supabase/client'
import { check, fromPostgrestError } from '../core/errors'
import { productImageUrl } from '../core/storage'

export type ReviewSource = 'whatsapp' | 'instagram' | 'facebook' | 'in_person' | 'other'

export const REVIEW_SOURCE_LABEL: Record<ReviewSource, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  in_person: 'In person',
  other: 'Other',
}

export interface Review {
  id: string
  customerName: string
  city: string | null
  rating: number
  body: string
  source: ReviewSource
  imagePath: string | null
  imageUrl: string | null
  reviewDate: string
  published: boolean
  sortOrder: number
}

export type ReviewInput = Omit<Review, 'id' | 'imageUrl'> & { id?: string }

interface ReviewRow {
  id: string
  customer_name: string
  city: string | null
  rating: number
  body: string
  source: ReviewSource
  image_path: string | null
  review_date: string
  published: boolean
  sort_order: number
}

const map = (r: ReviewRow): Review => ({
  id: r.id,
  customerName: r.customer_name,
  city: r.city,
  rating: r.rating,
  body: r.body,
  source: r.source,
  imagePath: r.image_path,
  imageUrl: r.image_path ? productImageUrl(r.image_path) : null,
  reviewDate: r.review_date,
  published: r.published,
  sortOrder: r.sort_order,
})

/** Customer reviews copied in from WhatsApp and elsewhere. RLS: public sees published, staff manage. */
export const reviewService = {
  async listPublished(): Promise<Review[]> {
    const { data, error } = await getSupabase()
      .from('reviews')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('review_date', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as ReviewRow[]).map(map)
  },

  async listAll(): Promise<Review[]> {
    const { data, error } = await getSupabase()
      .from('reviews')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('review_date', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as ReviewRow[]).map(map)
  },

  async save(input: ReviewInput): Promise<void> {
    const row = {
      customer_name: input.customerName.trim(),
      city: input.city?.trim() || null,
      rating: input.rating,
      body: input.body.trim(),
      source: input.source,
      image_path: input.imagePath,
      review_date: input.reviewDate,
      published: input.published,
      sort_order: input.sortOrder,
    }
    check(
      input.id
        ? await getSupabase().from('reviews').update(row).eq('id', input.id)
        : await getSupabase().from('reviews').insert(row),
    )
  },

  async remove(id: string): Promise<void> {
    check(await getSupabase().from('reviews').delete().eq('id', id))
  },
}
