import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import {
  useId,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils/cn'

const control =
  'w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-sm text-ink shadow-sm placeholder:text-ink-subtle transition-shadow focus:border-sand focus:ring-3 focus:ring-sand/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60'

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
      {children}
    </label>
  )
}

function Message({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={`${id}-error`} className="text-xs text-danger">
        {error}
      </p>
    )
  if (hint)
    return (
      <p id={`${id}-hint`} className="text-xs text-ink-subtle">
        {hint}
      </p>
    )
  return null
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  ref?: Ref<HTMLSelectElement>
}

export function Select({ label, error, hint, id, className, children, ...props }: SelectProps) {
  const auto = useId()
  const sid = id ?? auto
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={sid}>{label}</Label>}
      <select
        id={sid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${sid}-error` : hint ? `${sid}-hint` : undefined}
        className={cn(control, 'h-11 cursor-pointer', error && 'border-danger focus:border-danger focus:ring-danger/15', className)}
        {...props}
      >
        {children}
      </select>
      <Message id={sid} error={error} hint={hint} />
    </div>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ label, error, hint, id, className, rows = 3, ...props }: TextareaProps) {
  const auto = useId()
  const tid = id ?? auto
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={tid}>{label}</Label>}
      <textarea
        id={tid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${tid}-error` : hint ? `${tid}-hint` : undefined}
        className={cn(control, 'py-2.5 leading-relaxed', error && 'border-danger focus:border-danger focus:ring-danger/15', className)}
        {...props}
      />
      <Message id={tid} error={error} hint={hint} />
    </div>
  )
}

const ALERT = {
  error: { icon: AlertTriangle, cls: 'border-danger/40 bg-danger/10 text-danger' },
  success: { icon: CheckCircle2, cls: 'border-success/40 bg-success/10 text-success' },
  info: { icon: Info, cls: 'border-sand/20 bg-sand-100/60 text-sand' },
} as const

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof ALERT
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { icon: Icon, cls } = ALERT[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', cls, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 text-ink-muted">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className={title ? 'mt-1' : undefined}>{children}</div>}
      </div>
    </div>
  )
}
