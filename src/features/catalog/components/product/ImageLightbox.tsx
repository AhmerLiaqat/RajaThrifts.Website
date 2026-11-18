import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { ProductImage } from '@/types/product'

interface ImageLightboxProps {
  open: boolean
  images: Array<Pick<ProductImage, 'id' | 'url' | 'alt'>>
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

type Point = { x: number; y: number }
type View = { s: number; x: number; y: number }

const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
const IDENTITY: View = { s: 1, x: 0, y: 0 }

/**
 * Full-screen photo viewer for the product page. Works on phones: pinch to zoom, double-tap to
 * zoom in/out, drag to look around while zoomed, swipe left/right to change photo. On desktop,
 * the mouse wheel zooms and the arrow keys change photo.
 */
export function ImageLightbox({ open, images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [view, setView] = useState<View>(IDENTITY)
  const [animate, setAnimate] = useState(false)
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<{ start: View; mid: Point; dist: number; origin: Point; moved: boolean } | null>(null)
  const lastTap = useRef(0)
  const count = images.length
  const current = images[index]

  const go = (next: number) => {
    if (count < 2) return
    onIndexChange((next + count) % count)
  }

  // Each photo opens un-zoomed.
  const [shownIndex, setShownIndex] = useState(index)
  if (shownIndex !== index) {
    setShownIndex(index)
    setView(IDENTITY)
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % count)
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, onIndexChange, index, count])

  /** Point relative to the stage centre. */
  const local = (p: Point): Point => {
    const r = stageRef.current!.getBoundingClientRect()
    return { x: p.x - (r.left + r.width / 2), y: p.y - (r.top + r.height / 2) }
  }

  /** Keeps the zoomed photo covering the screen instead of drifting off it. */
  const clamp = (v: View): View => {
    const r = stageRef.current?.getBoundingClientRect()
    const s = Math.min(MAX_SCALE, Math.max(1, v.s))
    if (!r || s === 1) return { s, x: 0, y: 0 }
    const mx = ((s - 1) * r.width) / 2
    const my = ((s - 1) * r.height) / 2
    return { s, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) }
  }

  /** Zoom to `s` keeping the screen point `m` (stage-centred) fixed under the finger. */
  const zoomAround = (from: View, s: number, m0: Point, m1: Point = m0): View => {
    const u = { x: (m0.x - from.x) / from.s, y: (m0.y - from.y) / from.s }
    return clamp({ s, x: m1.x - u.x * s, y: m1.y - u.y * s })
  }

  const startGesture = () => {
    const pts = [...pointers.current.values()].map(local)
    const mid = pts.length > 1 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0]
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    gesture.current = { start: view, mid, dist, origin: pts[0], moved: false }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setAnimate(false)
    startGesture()
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const pts = [...pointers.current.values()].map(local)
    if (pts.length > 1) {
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      g.moved = true
      setView(zoomAround(g.start, (g.start.s * dist) / (g.dist || 1), g.mid, mid))
      return
    }
    const dx = pts[0].x - g.origin.x
    const dy = pts[0].y - g.origin.y
    if (Math.hypot(dx, dy) > 8) g.moved = true
    // Zoomed: pan. Not zoomed: follow the finger sideways as a swipe preview.
    setView(g.start.s > 1 ? clamp({ s: g.start.s, x: g.start.x + dx, y: g.start.y + dy }) : { s: 1, x: dx, y: 0 })
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    pointers.current.delete(e.pointerId)
    if (pointers.current.size > 0) {
      // One finger lifted mid-pinch: carry on panning with the other.
      startGesture()
      return
    }
    gesture.current = null
    setAnimate(true)
    if (!g) return

    if (!g.moved) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        lastTap.current = 0
        setView(view.s > 1 ? IDENTITY : zoomAround(view, DOUBLE_TAP_SCALE, local({ x: e.clientX, y: e.clientY })))
      } else lastTap.current = now
      return
    }
    if (g.start.s === 1 && pointers.current.size === 0 && view.s === 1) {
      if (view.x < -60) go(index + 1)
      else if (view.x > 60) go(index - 1)
      setView(IDENTITY)
    }
  }

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    setAnimate(false)
    const s = view.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)
    setView(zoomAround(view, s, local({ x: e.clientX, y: e.clientY })))
  }

  // Rendered on <body> so a moving or transformed parent (review strip, hover lift) cannot shift it.
  return createPortal(
    <AnimatePresence>
      {open && current && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col bg-black text-white"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm tabular-nums text-white/80">
              {index + 1} / {count}
            </span>
            <span className="hidden text-xs text-white/60 sm:inline">Scroll or double-click to zoom</span>
            <span className="text-xs text-white/60 sm:hidden">Pinch or double-tap to zoom</span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close photo viewer"
              className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
          </div>

          <div
            ref={stageRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            className="relative flex-1 touch-none overflow-hidden select-none"
            style={{ cursor: view.s > 1 ? 'grab' : 'zoom-in' }}
          >
            <img
              src={current.url}
              alt={current.alt}
              draggable={false}
              className="absolute inset-0 size-full object-contain"
              style={{
                transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
                transition: animate ? 'transform 250ms ease-out' : 'none',
              }}
            />
          </div>

          {count > 1 && (
            <div className="flex items-center justify-center gap-4 px-4 py-4">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous photo"
                className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next photo"
                className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
