import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Alert, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { IMAGE_VIEW_LABEL } from '@/constants/product'
import { ALLOWED_IMAGE_TYPES } from '@/services/core/storage'
import { REQUIRED_IMAGE_VIEWS, type ProductImage, type ProductImageView } from '@/types/product'
import { useImageMutations } from '../hooks'

const VIEWS = Object.keys(IMAGE_VIEW_LABEL) as ProductImageView[]

/**
 * Upload and organise product photos. Files go to Supabase Storage
 * (products/{productId}/…); the bucket policy only accepts staff uploads.
 */
export function ImageManager({
  productId,
  productName,
  images,
}: {
  productId: string
  productName: string
  images: ProductImage[]
}) {
  const { upload, update, remove } = useImageMutations(productId)
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(0)
  const [dragging, setDragging] = useState(false)

  const used = new Set(images.map((i) => i.view))
  const missing = REQUIRED_IMAGE_VIEWS.filter((v) => !used.has(v))

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    const queue = [...missing]
    let position = images.length
    for (const file of Array.from(files)) {
      // Fill missing standard angles first, then add as detail shots.
      const view: ProductImageView = queue.shift() ?? 'detail'
      setBusy((n) => n + 1)
      try {
        await upload.mutateAsync({
          file,
          view,
          alt: `${productName}, ${IMAGE_VIEW_LABEL[view].toLowerCase()} view`,
          position: position++,
        })
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setBusy((n) => n - 1)
      }
    }
    if (input.current) input.current.value = ''
  }

  const move = (index: number, dir: -1 | 1) => {
    const a = images[index]
    const b = images[index + dir]
    if (!a || !b) return
    update.mutate({ id: a.id, patch: { position: b.position } })
    update.mutate({ id: b.id, patch: { position: a.position } })
  }

  return (
    <div className="flex flex-col gap-4">
      {missing.length > 0 && (
        <p className="text-xs text-warning">
          Missing standard views: {missing.map((v) => IMAGE_VIEW_LABEL[v]).join(', ')}. Customers expect
          front, side, back and sole photos.
        </p>
      )}
      {(error || update.error || remove.error) && (
        <Alert tone="error">{error ?? update.error?.message ?? remove.error?.message}</Alert>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className="overflow-hidden rounded-sm border border-bone/10 bg-carbon">
            <img src={img.url} alt={img.alt} className="aspect-[4/5] w-full object-cover" />
            <div className="flex flex-col gap-2 p-2">
              <Select
                aria-label="Photo view"
                value={img.view}
                onChange={(e) =>
                  update.mutate({ id: img.id, patch: { view: e.target.value as ProductImageView } })
                }
                className="h-9 text-xs"
              >
                {VIEWS.map((v) => (
                  <option
                    key={v}
                    value={v}
                    disabled={v !== img.view && REQUIRED_IMAGE_VIEWS.includes(v as never) && used.has(v)}
                  >
                    {IMAGE_VIEW_LABEL[v]}
                  </option>
                ))}
              </Select>
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="rounded p-1.5 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={i === images.length - 1}
                    onClick={() => move(i, 1)}
                    className="rounded p-1.5 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => window.confirm('Delete this photo?') && remove.mutate(img)}
                  className="rounded p-1.5 text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {i === 0 && (
              <p className="bg-sand/10 py-1 text-center text-[10px] tracking-widest text-sand uppercase">
                Cover
              </p>
            )}
          </li>
        ))}

        <li>
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              onFiles(e.dataTransfer.files)
            }}
            className={`flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-2 text-center text-sm transition-colors ${
              dragging
                ? 'border-sand bg-sand/10 text-sand'
                : 'border-bone/20 text-ink-muted hover:border-sand hover:text-sand'
            }`}
          >
            {busy > 0 ? <Spinner /> : <ImagePlus className="size-6" />}
            {busy > 0 ? `Uploading ${busy}…` : dragging ? 'Drop to upload' : 'Add or drop photos'}
            <span className="text-[10px] text-ink-subtle">
              Multiple files · JPG, PNG, WebP · max 5 MB each
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </li>
      </ul>
    </div>
  )
}
