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
    <section className={cn('min-w-0 rounded-xl border border-line bg-surface-raised shadow-card', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
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
        'rounded-xl border bg-surface-raised p-5 shadow-card',
        tone === 'attention' ? 'border-warning/40 bg-warning/[0.04]' : 'border-line',
      )}
    >
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-ink-subtle">{note}</p>}
    </div>
  )
}

export function Pill({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
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
        'flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-3 shadow-sm focus-within:border-sand focus-within:ring-3 focus-within:ring-sand/15',
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
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
      className="no-scrollbar flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
            value === o.value ? 'bg-surface-raised text-ink shadow-sm ring-1 ring-line' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
          {o.count != null && (
            <span className={cn('tabular-nums', value === o.value ? 'rounded-full bg-sand-100 px-1.5 text-xs text-sand' : 'text-xs text-ink-subtle')}>
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
            className="absolute inset-0 bg-bone/40 backdrop-blur-[2px]"
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
            className={cn('absolute inset-y-0 right-0 flex w-full flex-col bg-surface-raised shadow-pop', width)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold">{title}</div>
                {subtitle && <div className="mt-0.5 text-xs text-ink-muted">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink">
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
      <h3 className="mb-3 text-xs font-semibold tracking-wide text-ink-subtle uppercase">{title}</h3>
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
    <div className="overflow-x-auto rounded-xl border border-line bg-surface-raised shadow-card">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="border-b border-line bg-surface-sunken text-left text-xs font-semibold tracking-wide text-ink-subtle uppercase">
          {head}
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
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
