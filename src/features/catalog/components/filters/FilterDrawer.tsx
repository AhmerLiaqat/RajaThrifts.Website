import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'
import { motion as m } from '@/theme/tokens'
import type { ProductFacets } from '@/types/product'
import type { CatalogFiltersApi } from '../../hooks/useCatalogFilters'
import { FilterPanel } from './filters'

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  api: CatalogFiltersApi
  facets?: ProductFacets
  resultCount?: number
}

/** Mobile/tablet filter sheet. Filters apply live; the footer button just closes it. */
export function FilterDrawer({ open, onClose, api, facets, resultCount }: FilterDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

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
        <div className="fixed inset-0 z-40 lg:hidden">
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
            aria-label="Filters"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.55, ease: m.ease.outExpo }}
            className="absolute inset-y-0 left-0 flex w-[min(420px,90vw)] flex-col bg-night shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-bone/10 px-5 py-4">
              <p className="text-sm font-semibold text-ink">Filters</p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="p-1 text-bone"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <FilterPanel api={api} facets={facets} />
            </div>
            <div className="flex gap-3 border-t border-bone/10 p-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={api.clearAll}
                disabled={api.activeCount === 0}
              >
                Clear
              </Button>
              <Button variant="primary" className="flex-[2]" onClick={onClose}>
                Show {resultCount ?? ''} {resultCount === 1 ? 'pair' : 'pairs'}
              </Button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
