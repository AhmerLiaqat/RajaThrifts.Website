import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Minus } from 'lucide-react'
import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { DemoTag } from '@/components/ui/DemoTag'
import { IMAGE_VIEW_LABEL } from '@/constants/product'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'
import { REQUIRED_IMAGE_VIEWS, type ProductImage, type ProductImageView } from '@/types/product'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
  isDemo?: boolean
  /** Greys out the stage for sold-out listings. */
  soldOut?: boolean
}

const COVERAGE_VIEWS: ProductImageView[] = [...REQUIRED_IMAGE_VIEWS, 'on_foot']

/**
 * Multi-view gallery:
 * - Thumbnails labelled by view (Front / Side / Back / Sole / On foot / Detail).
 * - Arrow keys, arrow buttons and swipe to navigate.
 * - Hover-to-zoom on fine pointers (follows the cursor).
 * - A coverage row that states which standard views were photographed,
 *   so customers know exactly what they are (and aren't) seeing.
 */
export function ProductGallery({ images, productName, isDemo, soldOut }: ProductGalleryProps) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)

  const count = images.length
  const current = images[index]

  const go = (next: number) => {
    if (count < 2) return
    setDirection(next > index ? 1 : -1)
    setIndex((next + count) % count)
    setZoom(null)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1)
    if (e.key === 'ArrowLeft') go(index - 1)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1)
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1)
  }

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const rect = e.currentTarget.getBoundingClientRect()
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const coverage = new Set(images.map((i) => i.view))

  if (!current) {
    return (
      <div className="grid aspect-[4/5] place-items-center rounded-sm bg-surface-sunken text-sm text-ink-muted">
        Photos coming soon
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:justify-end">
      {/* Stage */}
      <div className="relative min-w-0 flex-1 lg:max-w-[calc((100svh_-_12rem)_*_0.8)]">
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={`${productName} photos`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setZoom(null)}
          className={cn(
            'relative aspect-[4/5] overflow-hidden rounded-sm bg-surface-sunken outline-none focus-visible:ring-2 focus-visible:ring-sand',
            zoom ? 'cursor-zoom-out' : 'cursor-zoom-in',
          )}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={current.id}
              src={current.url}
              alt={current.alt}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 40, scale: 1.04 }),
                center: { opacity: 1, x: 0, scale: 1 },
                exit: (d: number) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: m.ease.outExpo }}
              drag={count > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={onDragEnd}
              draggable={false}
              style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              className={cn(
                'absolute inset-0 size-full touch-pan-y object-cover transition-[scale] duration-300 select-none',
                zoom && 'scale-[2]',
                soldOut && 'grayscale-[60%]',
              )}
            />
          </AnimatePresence>

          {/* Overlays */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between">
            <span className="rounded-full bg-night/70 px-3 py-1 font-display text-[11px] tracking-wider text-bone uppercase backdrop-blur">
              {IMAGE_VIEW_LABEL[current.view]}
            </span>
            {isDemo && <DemoTag label="Demo photo" />}
          </div>
          {soldOut && (
            <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-night/70 py-3 text-center font-display text-sm tracking-[0.4em] text-bone uppercase backdrop-blur-sm">
              Sold out
            </span>
          )}
          <span className="pointer-events-none absolute bottom-3 left-3 font-display text-xs text-bone/80 tabular-nums">
            {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </span>

          {count > 1 && (
            <div className="absolute right-3 bottom-3 flex gap-2">
              {(
                [
                  [-1, ChevronLeft, 'Previous photo'],
                  [1, ChevronRight, 'Next photo'],
                ] as const
              ).map(([d, Icon, label]) => (
                <button
                  key={d}
                  type="button"
                  aria-label={label}
                  onClick={() => go(index + d)}
                  className="grid size-10 place-items-center rounded-full bg-night/70 text-bone backdrop-blur transition-colors hover:bg-bone hover:text-night"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View coverage */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="font-display tracking-wider text-ink-subtle uppercase">Views</span>
          {COVERAGE_VIEWS.map((v) => {
            const has = coverage.has(v)
            const target = images.findIndex((i) => i.view === v)
            return (
              <button
                key={v}
                type="button"
                disabled={!has}
                onClick={() => has && go(target)}
                title={
                  has ? `Show ${IMAGE_VIEW_LABEL[v]} view` : `${IMAGE_VIEW_LABEL[v]} view not photographed`
                }
                className={cn(
                  'inline-flex items-center gap-1 tracking-wide',
                  has ? 'text-bone hover:text-sand' : 'cursor-default text-bone/30',
                )}
              >
                {has ? <Check className="size-3 text-sand" /> : <Minus className="size-3" />}
                {IMAGE_VIEW_LABEL[v]}
              </button>
            )
          })}
        </div>
        {isDemo && COVERAGE_VIEWS.some((v) => !coverage.has(v)) && (
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            Demo listing: only one stock photo per pair, plus close-ups of it. Real listings include front,
            side, back and sole photos of the actual pair.
          </p>
        )}
      </div>

      {/* Thumbnails: horizontal on mobile, vertical rail on desktop */}
      {count > 1 && (
        <ul
          className="no-scrollbar flex gap-3 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible"
          aria-label="Choose a photo"
        >
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}: ${IMAGE_VIEW_LABEL[img.view]}`}
                aria-current={i === index || undefined}
                className={cn(
                  'group relative block w-20 overflow-hidden rounded-sm border transition-colors',
                  i === index ? 'border-sand' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img src={img.url} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-night/75 py-0.5 text-center font-display text-[10px] tracking-wider text-bone uppercase">
                  {IMAGE_VIEW_LABEL[img.view]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
