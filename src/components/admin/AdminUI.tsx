import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'

/** Card surface for dashboard content. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-md border border-bone/10 bg-carbon/50', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-bone/10 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight text-bone">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Figure tile: label · value · optional note. */
export function StatTile({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  tone?: 'default' | 'attention'
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-carbon/50 p-4',
        tone === 'attention' ? 'border-sand/40' : 'border-bone/10',
      )}
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-bone tabular-nums">
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-ink-subtle">{note}</p>}
    </div>
  )
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-[0.16em] whitespace-nowrap uppercase',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <label
      className={cn(
        'flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3 focus-within:border-sand',
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-sm focus:outline-none"
      />
    </label>
  )
}

/** Segmented filter tabs, e.g. order or return status. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string; count?: number }>
}) {
  return (
    <div
      role="tablist"
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-md border border-bone/10 bg-carbon/50 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
            value === o.value ? 'bg-bone text-night' : 'text-ink-muted hover:text-bone',
          )}
        >
          {o.label}
          {o.count != null && (
            <span className={cn('tabular-nums', value === o.value ? 'text-night/60' : 'text-ink-subtle')}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Right-hand detail drawer. Escape and backdrop close it. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-xl',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-night/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: m.ease.outExpo }}
            className={cn('absolute inset-y-0 right-0 flex w-full flex-col bg-night shadow-pop', width)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-bone/10 p-5">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{title}</div>
                {subtitle && <div className="mt-0.5 text-xs text-ink-muted">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-bone">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-8 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] tracking-[0.22em] text-ink-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}

/** Table shell with consistent header styling and horizontal scroll on small screens. */
export function DataTable({
  head,
  children,
  minWidth = 760,
}: {
  head: ReactNode
  children: ReactNode
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-bone/10">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-carbon text-left text-[11px] tracking-[0.14em] text-ink-muted uppercase">
          {head}
        </thead>
        <tbody className="divide-y divide-bone/10">{children}</tbody>
      </table>
    </div>
  )
}

export function TableMessage({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-ink-muted">
        {children}
      </td>
    </tr>
  )
}
