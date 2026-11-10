import { ArrowRight } from 'lucide-react'
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
  const soldOut = product.totalStock === 0

  return (
    <article
      className={cn(
        '@container group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-18px_rgb(17_26_51/0.35)]',
        className,
      )}
    >
      <Link to={paths.product(product.slug)} className="flex flex-1 flex-col outline-none">
        <div
          className={cn(
            'relative overflow-hidden bg-gradient-to-br from-surface-sunken to-[#e9ecf5]',
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
                'absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.06]',
                soldOut && 'opacity-60 grayscale',
              )}
            />
          )}

          <div className="absolute top-3 left-3 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1.5">
            {off > 0 && !soldOut && (
              <span className="rounded-md bg-deal px-2 py-0.5 text-xs font-extrabold text-white shadow-sm">
                −{off}%
              </span>
            )}
            {isDemo && <DemoTag />}
          </div>

          <div className="absolute bottom-3 left-3">
            <CollectionBadge collection={product.collection} variant="solid" />
          </div>

          {soldOut ? (
            <span className="absolute inset-x-0 bottom-0 bg-bone/85 py-2 text-center text-xs font-bold tracking-wider text-white uppercase">
              Sold out
            </span>
          ) : (
            <span className="absolute right-3 bottom-3 hidden translate-y-2 items-center gap-1 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 @[12rem]:inline-flex">
              View pair <ArrowRight className="size-3.5" />
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">{product.brand}</p>
          <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-ink transition-colors group-hover:text-sand sm:text-[15px]">
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">{CONDITION_META[product.condition].label} condition</p>
          {product.availableSizes.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label="Available sizes">
              {product.availableSizes.slice(0, 4).map((sz) => (
                <li
                  key={sz.value}
                  className="rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted"
                >
                  EU {sz.value}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
            <span className="text-lg font-extrabold text-ink tabular-nums">{formatPrice(product.price)}</span>
            {off > 0 && product.compareAtPrice && (
              <s className="text-xs text-ink-subtle tabular-nums">{formatPrice(product.compareAtPrice)}</s>
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
