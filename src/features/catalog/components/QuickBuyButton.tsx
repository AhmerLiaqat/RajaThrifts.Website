import { Zap } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { cartStore } from '@/features/cart/store/cart-store'
import { cn } from '@/lib/utils/cn'
import { formatSize } from '@/lib/utils/sizes'
import type { ProductSummary } from '@/types/product'

type Variant = NonNullable<ProductSummary['variants']>[number]

/**
 * One-step order from a product card: puts the pair in the bag and goes straight to checkout.
 * Most thrift pairs have a single size; when there are several, the button first asks which one.
 */
export function QuickBuyButton({ product, className }: { product: ProductSummary; className?: string }) {
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)
  const variants = (product.variants ?? []).filter((v) => v.quantity > 0)

  if (product.totalStock === 0) return null

  const buy = (v: Variant) => {
    cartStore.add({
      variantId: v.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      collection: product.collection,
      imageUrl: product.primaryImage?.url ?? null,
      sizeLabel: formatSize(v.size, ' / '),
      sku: v.sku,
      unitPrice: v.priceOverride ?? product.price,
      maxQuantity: v.quantity,
    })
    // Already in the bag ("one of a kind") is fine: checkout still has it.
    cartStore.dismissToast()
    navigate(paths.checkout)
  }

  const onClick = () => {
    // Older cached data without variants: let the product page handle size choice.
    if (variants.length === 0) return navigate(paths.product(product.slug))
    if (variants.length === 1) return buy(variants[0])
    setChoosing((c) => !c)
  }

  return (
    <div className={cn('px-3 pb-3 sm:px-4 sm:pb-4', className)}>
      {choosing && (
        <div role="group" aria-label="Choose a size to buy" className="mb-2 flex flex-wrap gap-1.5">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => buy(v)}
              className="h-8 rounded-md border border-line-strong px-2 text-xs font-semibold text-ink tabular-nums transition-colors hover:border-sand hover:bg-sand hover:text-white"
            >
              {formatSize({ ...v.size, cm: null }, ' / ')}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-expanded={variants.length > 1 ? choosing : undefined}
        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-navy text-sm font-semibold text-white transition-colors hover:bg-gold hover:text-brand-navy"
      >
        <Zap className="size-4" aria-hidden />
        {choosing ? 'Pick your size' : 'Buy now'}
      </button>
    </div>
  )
}
