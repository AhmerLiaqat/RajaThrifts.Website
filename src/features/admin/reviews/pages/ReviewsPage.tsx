import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, ImagePlus, Pencil, Star, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Panel } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { productImageUrl, uploadReviewImage } from '@/services/core/storage'
import {
  REVIEW_SOURCE_LABEL,
  reviewService,
  type Review,
  type ReviewInput,
  type ReviewSource,
} from '@/services/reviews/review.service'

const KEY = ['admin', 'reviews'] as const
const today = () => new Date().toISOString().slice(0, 10)

const EMPTY: ReviewInput = {
  customerName: '',
  city: '',
  rating: 5,
  body: '',
  source: 'whatsapp',
  imagePath: null,
  reviewDate: today(),
  published: true,
  sortOrder: 0,
}

function useReviewMutations() {
  const qc = useQueryClient()
  const done = () => {
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: ['reviews'] })
  }
  return {
    save: useMutation({ mutationFn: reviewService.save, onSuccess: done }),
    remove: useMutation({ mutationFn: reviewService.remove, onSuccess: done }),
  }
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star className={cn('size-5', n <= value ? 'fill-sand text-sand' : 'text-bone/20')} />
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
          >
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        )
      })}
    </div>
  )
}

function ReviewForm({ initial, onDone }: { initial: ReviewInput; onDone: () => void }) {
  const { save } = useReviewMutations()
  const [v, setV] = useState<ReviewInput>(initial)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof ReviewInput>(k: K, value: ReviewInput[K]) => setV((s) => ({ ...s, [k]: value }))
  const valid = v.customerName.trim().length > 0 && v.body.trim().length >= 3

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) save.mutate(v, { onSuccess: onDone })
      }}
      className="flex flex-col gap-5"
    >
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Customer name"
          placeholder="Ayesha K."
          value={v.customerName}
          onChange={(e) => set('customerName', e.target.value)}
          hint="First name + initial is enough. Ask before using full names."
        />
        <Input label="City (optional)" placeholder="Lahore" value={v.city ?? ''} onChange={(e) => set('city', e.target.value)} />
      </div>
      <Textarea
        label="What they said"
        rows={4}
        placeholder="Paste the customer's WhatsApp message here"
        value={v.body}
        maxLength={600}
        onChange={(e) => set('body', e.target.value)}
        hint={`${v.body.length}/600`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-bone/80">Rating</p>
          <Stars value={v.rating} onChange={(n) => set('rating', n)} />
        </div>
        <Select label="Received on" value={v.source} onChange={(e) => set('source', e.target.value as ReviewSource)}>
          {(Object.keys(REVIEW_SOURCE_LABEL) as ReviewSource[]).map((s) => (
            <option key={s} value={s}>
              {REVIEW_SOURCE_LABEL[s]}
            </option>
          ))}
        </Select>
        <Input label="Date" type="date" value={v.reviewDate} onChange={(e) => set('reviewDate', e.target.value)} />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-bone/80">Screenshot (optional)</p>
        {v.imagePath ? (
          <div className="flex items-center gap-3">
            <img src={productImageUrl(v.imagePath)} alt="" className="h-24 w-20 rounded-lg object-cover" />
            <Button type="button" variant="ghost" size="sm" onClick={() => set('imagePath', null)}>
              <X className="size-4" /> Remove
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" /> Add screenshot
          </Button>
        )}
        <p className="mt-2 text-xs text-warning">
          Screenshots are public. Crop out phone numbers and profile pictures before uploading.
        </p>
        {uploadError && <p className="mt-1 text-xs text-danger">{uploadError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setUploading(true)
            setUploadError(undefined)
            try {
              set('imagePath', await uploadReviewImage(file))
            } catch (err) {
              setUploadError((err as Error).message)
            } finally {
              setUploading(false)
            }
          }}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-bone/85">
        <input
          type="checkbox"
          className="size-4 accent-sand"
          checked={v.published}
          onChange={(e) => set('published', e.target.checked)}
        />
        Show on the homepage
      </label>

      <div className="flex gap-3">
        <Button type="submit" variant="accent" loading={save.isPending} disabled={!valid}>
          {v.id ? 'Save changes' : 'Add review'}
        </Button>
        {v.id && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

function ReviewCard({ review, onEdit }: { review: Review; onEdit: () => void }) {
  const { save, remove } = useReviewMutations()
  const [confirm, setConfirm] = useState(false)
  return (
    <li className={cn('rounded-xl border border-line bg-surface-raised shadow-card p-5', !review.published && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {review.customerName}
            {review.city && <span className="text-ink-muted"> · {review.city}</span>}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {REVIEW_SOURCE_LABEL[review.source]} · {formatDate(review.reviewDate)}
            {!review.published && ' · Hidden'}
          </p>
        </div>
        <Stars value={review.rating} />
      </div>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-bone/90">“{review.body}”</p>
      {review.imageUrl && (
        <a href={review.imageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
          <img src={review.imageUrl} alt="" className="h-20 w-16 rounded-lg object-cover" />
        </a>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" /> Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate({ ...review, published: !review.published })}
        >
          {review.published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {review.published ? 'Hide' : 'Show'}
        </Button>
        {confirm ? (
          <Button variant="danger" size="sm" loading={remove.isPending} onClick={() => remove.mutate(review.id)}>
            Delete for good
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
            <Trash2 className="size-3.5" /> Delete
          </Button>
        )}
      </div>
    </li>
  )
}

/** Staff: copy customer feedback from WhatsApp into reviews shown on the homepage. */
export default function ReviewsPage() {
  const reviews = useQuery({ queryKey: KEY, queryFn: reviewService.listAll })
  const [editing, setEditing] = useState<ReviewInput | null>(null)
  const [formKey, setFormKey] = useState(0)
  const reset = () => {
    setEditing(null)
    setFormKey((k) => k + 1)
  }

  return (
    <>
      <AdminPageHeader
        title="Reviews"
        description="Most customers send feedback on WhatsApp. Paste it here and it appears in the Reviews section on the homepage."
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title={editing ? 'Edit review' : 'Add a review'}>
          <ReviewForm key={editing?.id ?? `new-${formKey}`} initial={editing ?? { ...EMPTY, reviewDate: today() }} onDone={reset} />
        </Panel>
        <div>
          {reviews.error && <Alert tone="error">{reviews.error.message}</Alert>}
          {reviews.data?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-bone/15 p-10 text-center text-sm text-ink-muted">
              No reviews yet. The homepage hides the Reviews section until you add one.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {reviews.data?.map((r) => (
              <ReviewCard key={r.id} review={r} onEdit={() => setEditing(r)} />
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
