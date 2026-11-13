import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Alert, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { IMAGE_VIEW_LABEL } from '@/constants/product'
import { ALLOWED_IMAGE_TYPES } from '@/services/core/storage'
import { MIN_PRODUCT_IMAGES, REQUIRED_IMAGE_VIEWS, type ProductImage, type ProductImageView } from '@/types/product'
import { useImageMutations } from '../hooks'
import { isAiStudioEnabled } from '../import/aiStudio'
import type { StudioMode } from '../import/photoStudio'

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
  // Same studio treatment as Bulk import, so single uploads match the rest of the catalogue.
  const [mode, setMode] = useState<StudioMode>('studio')
  const [notice, setNotice] = useState<string | null>(null)

  const used = new Set(images.map((i) => i.view))
  const missing = REQUIRED_IMAGE_VIEWS.filter((v) => !used.has(v))

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    setNotice(null)
    const queue = [...missing]
    let position = images.length
    const list = Array.from(files)
    for (const raw of list) {
      // Fill missing standard angles first, then add as detail shots.
      const view: ProductImageView = queue.shift() ?? 'detail'
      setBusy((n) => n + 1)
      try {
        const { processPhoto } = await import('../import/photoStudio')
        const res = await processPhoto(raw, mode, `${productId}-${position + 1}`, { view })
        URL.revokeObjectURL(res.previewUrl)
        if (res.note) setNotice(res.note)
        else if (mode !== 'original' && !res.backgroundRemoved)
          setNotice('The shoe could not be separated in one photo, so it kept its original background.')
        const file = res.file
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
      {/* Minimum photo requirement */}
      <div
        className={`flex items-center gap-3 rounded-lg border p-3 ${
          images.length >= MIN_PRODUCT_IMAGES ? 'border-success/25 bg-success/10' : 'border-warning/25 bg-warning/10'
        }`}
        role="status"
      >
        {images.length >= MIN_PRODUCT_IMAGES ? (
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        ) : (
          <ImagePlus className="size-5 shrink-0 text-warning" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {images.length >= MIN_PRODUCT_IMAGES
              ? `${images.length} photos added: ready to publish`
              : `${images.length} of ${MIN_PRODUCT_IMAGES} photos: add ${MIN_PRODUCT_IMAGES - images.length} more to publish`}
          </p>
          <div className="mt-1.5 flex gap-1" aria-hidden>
            {Array.from({ length: MIN_PRODUCT_IMAGES }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < images.length ? (images.length >= MIN_PRODUCT_IMAGES ? 'bg-success' : 'bg-warning') : 'bg-line-strong'}`}
              />
            ))}
          </div>
        </div>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-ink-muted">
          Tip: missing {missing.map((v) => IMAGE_VIEW_LABEL[v].toLowerCase()).join(', ')} view. Front, side, back and
          sole photos sell best.
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm text-ink sm:flex-row sm:items-center sm:gap-3">
        <span className="font-medium">Photo background</span>
        <Select
          aria-label="Photo background"
          value={mode}
          onChange={(e) => setMode(e.target.value as StudioMode)}
          className="h-9 text-sm sm:w-auto"
        >
          <option value="studio">Clean background (studio backdrop, runs in your browser)</option>
          {isAiStudioEnabled && <option value="ai">AI studio (best lighting, check the result)</option>}
          <option value="original">Keep original photo (crop only)</option>
        </Select>
      </label>
      {mode === 'ai' && (
        <p className="text-xs text-ink-muted">
          AI studio re-lights the photo on the studio backdrop. Always compare it with the real pair: if any
          scuff, mark or logo changed, delete it and re-upload with the clean background option.
        </p>
      )}
      {notice && <Alert tone="info">{notice}</Alert>}
      {(error || update.error || remove.error) && (
        <Alert tone="error">{error ?? update.error?.message ?? remove.error?.message}</Alert>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className="overflow-hidden rounded-xl border border-line bg-surface-raised shadow-card">
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
                    className="rounded p-1.5 hover:bg-surface-sunken disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={i === images.length - 1}
                    onClick={() => move(i, 1)}
                    className="rounded p-1.5 hover:bg-surface-sunken disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() =>
                    window.confirm(
                      images.length <= MIN_PRODUCT_IMAGES
                        ? `Delete this photo? This listing will have fewer than ${MIN_PRODUCT_IMAGES} photos and cannot be published until you add more.`
                        : 'Delete this photo?',
                    ) && remove.mutate(img)
                  }
                  className="rounded p-1.5 text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            {i === 0 && (
              <p className="bg-sand/10 py-1 text-center text-[11px] tracking-widest text-sand uppercase">
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
            className={`flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-2 text-center text-sm transition-colors ${
              dragging
                ? 'border-sand bg-sand/10 text-sand'
                : 'border-line-strong text-ink-muted hover:border-sand hover:text-sand'
            }`}
          >
            {busy > 0 ? <Spinner /> : <ImagePlus className="size-6" />}
            {busy > 0 ? `Uploading ${busy}…` : dragging ? 'Drop to upload' : 'Add or drop photos'}
            <span className="text-[11px] text-ink-subtle">
              Multiple files · JPG, PNG, WebP, HEIC
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept={[...ALLOWED_IMAGE_TYPES, '.heic', '.heif'].join(',')}
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </li>
      </ul>
    </div>
  )
}
