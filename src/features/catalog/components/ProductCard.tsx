import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { DemoTag } from '@/components/ui/DemoTag'
import { WishlistButton } from '@/features/wishlist/WishlistButton'
import { cn } from '@/lib/utils/cn'
import { discountPercent, formatPrice } from '@/lib/utils/format'
import { CONDITION_META } from '@/constants/product'
import type { ProductSummary } from '@/types/product'
import { CollectionBadge } from './CollectionBadge'

interface ProductCardProps {
  product: ProductSummary
  /** Legacy prop, ignored: cards share one style. */
  tone?: 'dark' | 'light'
  aspect?: 'portrait' | 'tall' | 'square'
  isDemo?: boolean
  className?: string
  /** Eager-load images above the fold. */
  priority?: boolean
}

export function ProductCard({
  product,
  aspect = 'portrait',
  isDemo = false,
  className,
  priority = false,
}: ProductCardProps) {
  const off = discountPercent(product.price, product.compareAtPrice)
  const sizes = product.availableSizes.map((s) => s.value).join(' · ')
  const soldOut = product.totalStock === 0

  return (
    <article
      className={cn(
        '@container group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface-raised transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-glow',
        className,
      )}
    >
      <Link to={paths.product(product.slug)} className="flex flex-1 flex-col outline-none">
        <div
          className={cn(
            'relative overflow-hidden bg-surface-sunken',
            aspect === 'portrait' && 'aspect-[4/5]',
            aspect === 'tall' && 'aspect-[3/4.4]',
            aspect === 'square' && 'aspect-square',
          )}
        >
          {product.primaryImage && (
            <img
              src={product.primaryImage.url}
              alt={product.primaryImage.alt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={cn(
                'absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
                soldOut && 'opacity-60 grayscale',
              )}
            />
          )}

          {soldOut && (
            <span className="absolute bottom-3 left-3 rounded-md bg-bone px-2 py-1 text-xs font-semibold text-white">
              Sold out
            </span>
          )}

          <div className="absolute top-3 left-3 flex max-w-[calc(100%-3.5rem)] flex-wrap items-start gap-1.5">
            <CollectionBadge collection={product.collection} variant="solid" />
            {isDemo && <DemoTag />}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <p className="text-xs font-medium text-ink-subtle">{product.brand}</p>
          <h3 className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold text-ink sm:text-[15px]">
            {product.name}
          </h3>
          <p className="mt-1.5 text-xs text-ink-muted">
            {CONDITION_META[product.condition].label}
            {sizes && <span> · EU {sizes}</span>}
          </p>
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
            <span className="text-base font-bold text-ink tabular-nums">{formatPrice(product.price)}</span>
            {off > 0 && product.compareAtPrice && (
              <>
                <s className="text-xs text-ink-subtle tabular-nums">{formatPrice(product.compareAtPrice)}</s>
                <span className="text-xs font-semibold text-success">−{off}%</span>
              </>
            )}
          </div>
        </div>
      </Link>
      {/* Outside the link: a button cannot live inside an anchor. */}
      <WishlistButton
        productId={product.id}
        productName={product.name}
        className="absolute top-3 right-3 z-10"
      />
    </article>
  )
}
