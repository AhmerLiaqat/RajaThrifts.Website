import { Spinner } from '@/components/ui'

export function PageLoader() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-ink-muted">
      <Spinner className="size-7" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
