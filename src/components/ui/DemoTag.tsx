import { cn } from '@/lib/utils/cn'

/** Marks demo listings and placeholder content so it is never mistaken for real inventory. */
export function DemoTag({ className, label = 'Demo' }: { className?: string; label?: string }) {
  return (
    <span
      title="Sample content for design preview. Not real inventory."
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-bone/25 bg-night/60 px-2 py-0.5 font-display text-[10px] font-medium tracking-[0.2em] text-bone/80 uppercase backdrop-blur-sm',
        className,
      )}
    >
      <span className="size-1 rounded-full bg-sand" aria-hidden />
      {label}
    </span>
  )
}
