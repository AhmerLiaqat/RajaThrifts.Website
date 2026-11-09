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
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-widest',
        variant === 'solid' ? tone.solid : [tone.soft, tone.text],
        className,
      )}
    >
      {collection}
    </span>
  )
}
