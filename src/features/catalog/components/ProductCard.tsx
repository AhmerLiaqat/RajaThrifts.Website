import { ArrowUpRight } from 'lucide-react'
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
  /** `light` for cards placed on bone-coloured sections. */
  tone?: 'dark' | 'light'
  aspect?: 'portrait' | 'tall' | 'square'
  isDemo?: boolean
  className?: string
  /** Eager-load images above the fold. */
  priority?: boolean
}

export function ProductCard({
  product,
  tone = 'dark',
  aspect = 'portrait',
  isDemo = false,
  className,
  priority = false,
}: ProductCardProps) {
  const light = tone === 'light'
  const off = discountPercent(product.price, product.compareAtPrice)
  const sizes = product.availableSizes.map((s) => s.value).join(' · ')
  const soldOut = product.totalStock === 0

  return (
    <article className={cn('@container group relative', className)}>
      <Link to={paths.product(product.slug)} className="block outline-none">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl ring-1 transition-shadow duration-500',
            light ? 'bg-night/5 ring-night/10' : 'bg-carbon ring-white/10 group-hover:shadow-glow',
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
                'absolute inset-0 size-full object-cover transition-[transform,filter] duration-[1.4s] ease-out-expo group-hover:scale-[1.06]',
                soldOut && 'grayscale-[70%] brightness-75',
              )}
            />
          )}

          {/* Cinematic vignette */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-night/10 opacity-80 transition-opacity duration-700 group-hover:opacity-100"
          />

          {soldOut && (
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-night/70 py-2 text-center font-display text-xs tracking-[0.4em] text-bone uppercase backdrop-blur-sm">
              Sold out
            </span>
          )}

          <div className="absolute top-3 left-3 flex max-w-[calc(100%-3.5rem)] flex-wrap items-start gap-1.5">
            <CollectionBadge collection={product.collection} variant="solid" />
            {isDemo && <DemoTag />}
          </div>

          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-bone">
            <span className="font-display text-[10px] tracking-[0.25em] text-bone/70 uppercase">
              {CONDITION_META[product.condition].label}
              {sizes && <span className="ml-2 text-bone">EU {sizes}</span>}
            </span>
            <span className="grid size-9 translate-y-2 place-items-center rounded-full bg-bone text-night opacity-0 transition-all duration-500 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 @[15rem]:flex-row @[15rem]:items-start @[15rem]:justify-between @[15rem]:gap-4">
          <div className="min-w-0">
            <p
              className={cn(
                'font-display text-[11px] tracking-[0.25em] uppercase',
                light ? 'text-night/50' : 'text-ink-subtle',
              )}
            >
              {product.brand}
            </p>
            <h3
              className={cn(
                'mt-1 line-clamp-2 font-display text-sm leading-snug sm:text-base font-medium tracking-normal',
                light ? 'text-night' : 'text-bone',
              )}
            >
              {product.name}
            </h3>
          </div>
          <div className="flex shrink-0 items-baseline gap-2 @[15rem]:block @[15rem]:text-right">
            <p
              className={cn(
                'font-display text-sm font-medium tabular-nums',
                light ? 'text-night' : 'text-bone',
              )}
            >
              {formatPrice(product.price)}
            </p>
            {off > 0 && product.compareAtPrice && (
              <p className={cn('text-xs tabular-nums', light ? 'text-night/45' : 'text-ink-subtle')}>
                <s>{formatPrice(product.compareAtPrice)}</s>
                <span className={cn('ml-1.5', light ? 'text-sand-700' : 'text-sand')}>−{off}%</span>
              </p>
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
