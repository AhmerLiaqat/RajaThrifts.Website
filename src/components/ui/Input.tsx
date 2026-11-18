import { useId, type InputHTMLAttributes, type Ref } from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  ref?: Ref<HTMLInputElement>
}

/** Works directly with react-hook-form's `register()` (React 19 passes `ref` as a prop). */
export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full min-w-0 rounded-lg border border-line-strong bg-surface-raised px-3 text-sm text-ink shadow-sm transition-shadow',
          'placeholder:text-ink-subtle focus:border-sand focus:ring-3 focus:ring-sand/15 focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60',
          error && 'border-danger focus:border-danger focus:ring-danger/15',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
