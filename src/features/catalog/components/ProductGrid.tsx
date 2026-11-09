import { motion } from 'framer-motion'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'
import type { ProductSummary } from '@/types/product'
import { ProductCard } from './ProductCard'

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3 2xl:grid-cols-4'

interface ProductGridProps {
  products: ProductSummary[]
  isDemo?: boolean
  /** Dim the grid while a new result set loads (previous results stay visible). */
  isRefreshing?: boolean
  className?: string
}

export function ProductGrid({ products, isDemo = false, isRefreshing = false, className }: ProductGridProps) {
  return (
    <ul
      aria-busy={isRefreshing || undefined}
      className={cn(GRID, 'transition-opacity duration-300', isRefreshing && 'opacity-50', className)}
    >
      {products.map((p, i) => (
        <motion.li
          key={p.id}
          layout="position"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: m.duration.slow, ease: m.ease.outExpo, delay: Math.min(i, 8) * 0.04 }}
        >
          <ProductCard product={p} isDemo={isDemo} priority={i < 4} />
        </motion.li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={GRID} aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-sm bg-carbon" />
          <Skeleton className="mt-4 h-3 w-16 bg-carbon" />
          <Skeleton className="mt-2 h-4 w-3/4 bg-carbon" />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridEmpty({ onClear }: { onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-sm border border-dashed border-bone/15 px-6 py-20 text-center">
      <SearchX className="size-8 text-sand" aria-hidden />
      <h2 className="mt-5 text-2xl font-semibold uppercase">No pairs match</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Try a different size or brand, widen the price range, or include sold-out pairs.
      </p>
      {onClear && (
        <Button variant="outline" className="mt-8" onClick={onClear}>
          Clear all filters
        </Button>
      )}
    </div>
  )
}
