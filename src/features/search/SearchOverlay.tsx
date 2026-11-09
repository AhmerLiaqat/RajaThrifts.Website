import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { useProducts } from '@/features/catalog/hooks/useProducts'
import { formatPrice } from '@/lib/utils/format'
import { motion as m } from '@/theme/tokens'

const SUGGESTIONS = ['Jordan', 'New Balance', 'Converse', 'Air Max', 'White']

function useDebounced<T>(value: T, ms = 220) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}

function SearchResults({ term, onNavigate }: { term: string; onNavigate: () => void }) {
  const { data, isFetching } = useProducts({ search: term, pageSize: 6, availability: 'all' })

  if (!data) return <p className="py-6 text-sm text-ink-muted">Searching…</p>
  if (data.total === 0) return <p className="py-6 text-sm text-ink-muted">No pairs match “{term}”.</p>

  return (
    <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <ul className="divide-y divide-bone/10">
        {data.items.map((p) => (
          <li key={p.id}>
            <Link
              to={paths.product(p.slug)}
              onClick={onNavigate}
              className="group flex items-center gap-4 py-3"
            >
              {p.primaryImage && (
                <img src={p.primaryImage.url} alt="" className="size-14 rounded-sm object-cover" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] tracking-[0.2em] text-ink-subtle uppercase">
                  {p.brand}
                </span>
                <span className="block truncate font-display text-bone group-hover:text-sand">{p.name}</span>
              </span>
              <span className="hidden sm:block">
                <CollectionBadge collection={p.collection} />
              </span>
              <span className="w-24 text-right font-display text-sm tabular-nums">
                {p.totalStock === 0 ? (
                  <span className="text-ink-subtle">Sold out</span>
                ) : (
                  formatPrice(p.price)
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to={`${paths.shop}?q=${encodeURIComponent(term)}`}
        onClick={onNavigate}
        className="mt-4 inline-flex items-center gap-2 font-display text-xs tracking-[0.22em] text-sand uppercase"
      >
        See all {data.total} results <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

/** Full-screen instant search, opened from the navbar. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState('')
  const debounced = useDebounced(term.trim())
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const close = () => {
    onClose()
    setTerm('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-night/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: m.ease.outExpo }}
            className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-16"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="p-2 text-bone hover:text-sand"
              >
                <X className="size-6" />
              </button>
            </div>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                if (!term.trim()) return
                navigate(`${paths.shop}?q=${encodeURIComponent(term.trim())}`)
                close()
              }}
              className="mt-4 flex items-center gap-4 border-b border-bone/25 pb-4 focus-within:border-sand"
            >
              <Search className="size-6 shrink-0 text-sand" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search pairs"
                aria-label="Search pairs"
                className="min-w-0 flex-1 bg-transparent font-display text-3xl tracking-tight text-bone placeholder:text-bone/25 focus:outline-none sm:text-5xl [&::-webkit-search-cancel-button]:hidden"
              />
            </form>

            <div className="mt-6">
              {debounced ? (
                <SearchResults term={debounced} onNavigate={close} />
              ) : (
                <div>
                  <p className="font-display text-[11px] tracking-[0.24em] text-ink-subtle uppercase">Try</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTerm(s)}
                        className="rounded-full border border-bone/15 px-4 py-2 text-sm text-bone/80 hover:border-sand hover:text-sand"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
