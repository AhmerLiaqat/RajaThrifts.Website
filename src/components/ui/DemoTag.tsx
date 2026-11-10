import { cn } from '@/lib/utils/cn'

/** Marks demo listings and placeholder content so it is never mistaken for real inventory. */
export function DemoTag({ className, label = 'Demo' }: { className?: string; label?: string }) {
  return (
    <span
      title="Sample content for design preview. Not real inventory."
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-line bg-white/90 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase',
        className,
      )}
    >
      <span className="size-1 rounded-full bg-gold" aria-hidden />
      {label}
    </span>
  )
}
