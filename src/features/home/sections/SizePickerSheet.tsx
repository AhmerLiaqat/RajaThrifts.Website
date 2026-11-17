import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'

export interface SizeRow {
  system: 'EU' | 'UK'
  /** Shop URL parameter for this size system. */
  param: 'size' | 'uk'
  values: readonly string[]
}

/**
 * Size finder opened from the homepage "Shop by size" button: a bottom sheet on phones and a
 * side panel on larger screens, with an EU / UK switch. Picking a size opens the shop filtered to it.
 */
export function SizePickerSheet({ open, onClose, rows }: { open: boolean; onClose: () => void; rows: readonly SizeRow[] }) {
  const [system, setSystem] = useState<SizeRow['system']>('EU')
  const closeRef = useRef<HTMLButtonElement>(null)
  const row = rows.find((r) => r.system === system) ?? rows[0]

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-bone/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.45, ease: m.ease.outExpo }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-pop sm:inset-x-auto sm:top-0 sm:right-0 sm:max-h-none sm:w-[400px] sm:rounded-none sm:p-6"
          >
            <div className="flex items-center justify-between">
              <p id="size-sheet-title" className="text-lg font-bold text-ink">
                Shop by size
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close size finder"
                className="grid size-10 place-items-center rounded-lg text-ink hover:bg-surface-sunken"
              >
                <X className="size-5" />
              </button>
            </div>

            <div role="tablist" aria-label="Size system" className="mt-4 inline-flex rounded-lg bg-surface-sunken p-1">
              {rows.map((r) => (
                <button
                  key={r.system}
                  type="button"
                  role="tab"
                  aria-selected={r.system === system}
                  onClick={() => setSystem(r.system)}
                  className={cn(
                    'h-9 rounded-md px-5 text-sm font-semibold transition-colors',
                    r.system === system ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {r.system}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {row.values.map((v) => (
                <Link
                  key={v}
                  to={`${paths.shop}?${row.param}=${encodeURIComponent(v)}&stock=in_stock`}
                  onClick={onClose}
                  aria-label={`Shop ${row.system} size ${v}`}
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-line-strong text-sm font-semibold text-ink tabular-nums transition-colors hover:border-sand hover:bg-sand hover:text-white"
                >
                  {v}
                </Link>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-subtle">Tap a size to see every pair available in it.</p>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
