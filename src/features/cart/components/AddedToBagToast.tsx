import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { formatPrice } from '@/lib/utils/format'
import { motion as m } from '@/theme/tokens'
import { cartStore, useCart } from '../store/cart-store'

/** Confirmation shown after Add to Cart. Auto-dismisses after 4.5s. */
export function AddedToBagToast() {
  const { lastAdded, count } = useCart()

  useEffect(() => {
    if (!lastAdded) return
    const id = window.setTimeout(() => cartStore.dismissToast(), 4500)
    return () => window.clearTimeout(id)
  }, [lastAdded])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-end sm:inset-x-6 sm:bottom-26"
    >
      <AnimatePresence>
        {lastAdded && (
          <motion.div
            key={lastAdded.at}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: m.ease.outExpo }}
            className="pointer-events-auto flex w-full max-w-sm gap-4 rounded-xl border border-line bg-surface-raised shadow-card p-4 shadow-pop backdrop-blur-xl"
          >
            {lastAdded.item.imageUrl && (
              <img
                src={lastAdded.item.imageUrl}
                alt=""
                className="size-20 shrink-0 rounded-sm object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-display text-xs tracking-wider text-sand uppercase">
                <Check className="size-3.5" /> Added to bag
              </p>
              <p className="mt-1.5 truncate text-sm text-bone">{lastAdded.item.name}</p>
              <p className="text-xs text-ink-muted">
                {lastAdded.item.sizeLabel} · {formatPrice(lastAdded.item.unitPrice)}
              </p>
              <Link
                to={paths.cart}
                onClick={() => cartStore.dismissToast()}
                className="mt-2 inline-block text-sm font-medium text-ink underline underline-offset-4 hover:text-sand"
              >
                View bag ({count})
              </Link>
            </div>
            <button
              type="button"
              onClick={() => cartStore.dismissToast()}
              aria-label="Dismiss"
              className="self-start text-ink-muted hover:text-bone"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
