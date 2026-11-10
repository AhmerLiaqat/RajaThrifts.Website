import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { motion as m } from '@/theme/tokens'

interface FilterGroupProps {
  title: string
  /** Shown next to the title, e.g. number of selected options. */
  badge?: number
  onClear?: () => void
  defaultOpen?: boolean
  children: ReactNode
}

/** Collapsible filter section with an optional "Clear" action. */
export function FilterGroup({ title, badge, onClear, defaultOpen = true, children }: FilterGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <section className="border-b border-bone/10 py-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-ink"
        >
          {title}
          {!!badge && (
            <span className="grid size-5 place-items-center rounded-full bg-sand text-[11px] font-semibold tracking-normal text-night">
              {badge}
            </span>
          )}
        </button>
        {onClear && !!badge && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-ink-muted underline-offset-4 hover:text-bone hover:underline"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          className="text-ink-muted hover:text-bone"
        >
          {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: m.ease.outExpo }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
