import type { Collection } from '@/constants/collections'
import { cn } from '@/lib/utils/cn'
import { collectionTone } from '@/theme/tokens'

export function CollectionBadge({
  collection,
  variant = 'soft',
  className,
}: {
  collection: Collection
  variant?: 'solid' | 'soft'
  className?: string
}) {
  const tone = collectionTone[collection]
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide',
        variant === 'solid' ? tone.solid : [tone.soft, tone.text],
        className,
      )}
    >
      {collection}
    </span>
  )
}
