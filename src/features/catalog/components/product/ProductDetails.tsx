import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CircleCheck, Minus, Plus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { CONDITION_META, CONDITION_ORDER, DEFECT_SEVERITY_META } from '@/constants/product'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'
import type { ConditionGrade, ProductDefect, ProductVariant } from '@/types/product'

/* ── Size selector ────────────────────────────────────────────────────── */

interface SizeSelectorProps {
  variants: ProductVariant[]
  selectedId: string | null
  onSelect: (variantId: string) => void
}

export function SizeSelector({ variants, selectedId, onSelect }: SizeSelectorProps) {
  const sorted = [...variants].sort((a, b) => Number(a.size.value) - Number(b.size.value))
  return (
    <div role="radiogroup" aria-label="Size (EU)" className="flex flex-wrap gap-2">
      {sorted.map((v) => {
        const soldOut = v.quantity === 0
        const selected = v.id === selectedId
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={soldOut}
            onClick={() => onSelect(v.id)}
            title={soldOut ? `EU ${v.size.value} has sold` : `EU ${v.size.value}`}
            className={cn(
              'relative h-12 min-w-16 rounded-sm border px-4 font-display text-sm tabular-nums transition-colors',
              selected ? 'border-sand bg-sand text-night' : 'border-bone/20 text-bone hover:border-bone/60',
              soldOut && 'cursor-not-allowed border-bone/10 text-bone/25 line-through hover:border-bone/10',
            )}
          >
            EU {v.size.value}
          </button>
        )
      })}
    </div>
  )
}

/* ── Condition meter ──────────────────────────────────────────────────── */

export function ConditionMeter({ grade }: { grade: ConditionGrade }) {
  const meta = CONDITION_META[grade]
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-lg font-medium text-bone">{meta.label}</p>
        <p className="text-xs text-ink-muted">{meta.description}</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden>
        {CONDITION_ORDER.map((g) => (
          <span
            key={g}
            className={cn(
              'h-1.5 rounded-full',
              CONDITION_META[g].rank <= meta.rank ? 'bg-sand' : 'bg-bone/10',
            )}
          />
        ))}
      </div>
      <div
        className="mt-1.5 grid grid-cols-4 gap-1.5 text-[10px] tracking-wide text-ink-subtle uppercase"
        aria-hidden
      >
        {CONDITION_ORDER.map((g) => (
          <span key={g} className={g === grade ? 'text-sand' : undefined}>
            {CONDITION_META[g].label}
          </span>
        ))}
      </div>
      <p className="sr-only">
        Condition: {meta.label}, {meta.rank} of 4.
      </p>
    </div>
  )
}

/* ── Defect disclosure ────────────────────────────────────────────────── */

export function DefectList({ defects, notes }: { defects: ProductDefect[]; notes?: string | null }) {
  return (
    <div>
      {notes && <p className="text-sm leading-relaxed text-bone/80">{notes}</p>}
      {defects.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-success">
          <CircleCheck className="size-4" /> No defects recorded at inspection.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-bone/10 border-y border-bone/10">
          {defects.map((d, i) => {
            const sev = DEFECT_SEVERITY_META[d.severity]
            return (
              <li key={i} className="flex gap-4 py-3.5">
                <AlertTriangle
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    d.severity === 'minor' ? 'text-ink-subtle' : sev.className,
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-bone">{d.area}</p>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 font-display text-[9px] tracking-[0.2em] uppercase',
                        sev.className,
                      )}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{d.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ── Stock status ─────────────────────────────────────────────────────── */

export function StockStatus({ variant, totalStock }: { variant: ProductVariant | null; totalStock: number }) {
  let tone: 'ok' | 'low' | 'out'
  let text: string
  if (totalStock === 0) {
    tone = 'out'
    text = 'Sold out. Every size has found a new owner.'
  } else if (!variant) {
    tone = 'ok'
    text = `${totalStock} ${totalStock === 1 ? 'pair' : 'pairs'} in stock. Select a size.`
  } else if (variant.quantity === 0) {
    tone = 'out'
    text = `EU ${variant.size.value} has sold.`
  } else if (variant.quantity === 1) {
    tone = 'low'
    text = `In stock. Only one pair in EU ${variant.size.value}, it won’t be restocked.`
  } else {
    tone = 'ok'
    text = `In stock: ${variant.quantity} pairs in EU ${variant.size.value}.`
  }

  return (
    <p className="flex items-center gap-2.5 text-sm" role="status">
      <span className="relative flex size-2.5">
        {tone !== 'out' && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60',
              tone === 'low' ? 'bg-warning' : 'bg-success',
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex size-2.5 rounded-full',
            tone === 'out' ? 'bg-bone/30' : tone === 'low' ? 'bg-warning' : 'bg-success',
          )}
        />
      </span>
      <span className={tone === 'out' ? 'text-ink-muted' : 'text-bone'}>{text}</span>
    </p>
  )
}

/* ── Accordion ────────────────────────────────────────────────────────── */

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="border-b border-bone/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-5 text-left font-display text-xs tracking-[0.24em] text-bone uppercase"
      >
        {title}
        {open ? <Minus className="size-4 text-sand" /> : <Plus className="size-4 text-ink-muted" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: m.ease.outExpo }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm leading-relaxed text-ink-muted">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
