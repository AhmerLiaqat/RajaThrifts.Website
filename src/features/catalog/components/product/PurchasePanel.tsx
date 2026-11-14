import { Check, Fingerprint, ShieldCheck, ShoppingBag, Zap } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Button } from '@/components/ui'
import { DemoTag } from '@/components/ui/DemoTag'
import { cartStore, useCart } from '@/features/cart/store/cart-store'
import { WishlistButton } from '@/features/wishlist/WishlistButton'
import { discountPercent, formatPrice, formatPriceCode } from '@/lib/utils/format'
import { formatSize } from '@/lib/utils/sizes'
import type { Product } from '@/types/product'
import { CollectionBadge } from '../CollectionBadge'
import { ConditionMeter, DefectList, SizeSelector, StockStatus } from './ProductDetails'

interface PurchasePanelProps {
  product: Product
  isDemo?: boolean
}

export function PurchasePanel({ product, isDemo }: PurchasePanelProps) {
  const navigate = useNavigate()
  const cart = useCart()

  const inStock = product.variants.filter((v) => v.quantity > 0)
  const totalStock = inStock.reduce((n, v) => n + v.quantity, 0)
  // Thrift listings often have one size: pre-select it.
  const [selectedId, setSelectedId] = useState<string | null>(inStock.length === 1 ? inStock[0].id : null)
  const [sizeError, setSizeError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const variant = product.variants.find((v) => v.id === selectedId) ?? null
  const price = variant?.priceOverride ?? product.price
  const off = discountPercent(price, product.compareAtPrice)
  const inBag = variant ? cart.items.find((i) => i.variantId === variant.id) : undefined
  const atMax = !!inBag && !!variant && inBag.quantity >= variant.quantity
  const soldOut = totalStock === 0

  /** Returns true if the item is (now) in the bag. */
  const addSelected = (): boolean => {
    if (!variant) {
      setSizeError(true)
      document.getElementById('size-heading')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    const result = cartStore.add({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      collection: product.collection,
      imageUrl: product.images[0]?.url ?? null,
      sizeLabel: formatSize(variant.size, ' / '),
      sku: variant.sku,
      unitPrice: price,
      maxQuantity: variant.quantity,
    })
    setNotice(result === 'already_max' ? 'This pair is already in your bag (one of a kind).' : null)
    return true
  }

  const onBuyNow = () => {
    if (inBag || addSelected()) {
      cartStore.dismissToast()
      navigate(paths.checkout)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <CollectionBadge collection={product.collection} variant="solid" />
        {isDemo && <DemoTag label="Demo listing" />}
      </div>

      <p className="mt-5 text-sm font-semibold text-sand">{product.brand}</p>
      <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-ink sm:text-3xl">
        {product.name}
      </h1>
      {product.model && <p className="mt-2 text-sm text-ink-muted">{product.model}</p>}

      {/* Price */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p
          className="font-display text-3xl font-medium tabular-nums"
          aria-label={`Price ${formatPriceCode(price)}`}
        >
          {formatPriceCode(price)}
        </p>
        {off > 0 && product.compareAtPrice && (
          <p className="text-sm text-ink-muted tabular-nums">
            Retail <s>{formatPrice(product.compareAtPrice)}</s>
            <span className="ml-2 rounded-full bg-sand/15 px-2 py-0.5 text-xs text-sand">Save {off}%</span>
          </p>
        )}
      </div>

      {/* SKU */}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
        <div className="flex gap-1.5">
          <dt>SKU</dt>
          <dd className="font-mono text-bone/80">
            {variant?.sku ?? product.variants[0]?.sku.replace(/-\d+$/, '-…')}
          </dd>
        </div>
        {product.originCountry && (
          <div className="flex gap-1.5">
            <dt>Imported from</dt>
            <dd className="text-bone/80">{product.originCountry}</dd>
          </div>
        )}
      </dl>

      {/* Size */}
      <div className="mt-8 border-t border-bone/10 pt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="size-heading" className="text-sm font-medium text-ink">
            Size <span className="text-ink-subtle">(EU / UK / US)</span>
          </h2>
          {variant && <span className="text-xs text-ink-muted">Selected: {formatSize(variant.size)}</span>}
        </div>
        <SizeSelector
          variants={product.variants}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setSizeError(false)
            setNotice(null)
          }}
        />
        {sizeError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            Please select a size first.
          </p>
        )}
        <div className="mt-4">
          <StockStatus variant={variant} totalStock={totalStock} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          size="lg"
          disabled={soldOut || atMax}
          onClick={() => addSelected()}
          className="w-full"
        >
          {atMax ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
          {soldOut ? 'Sold out' : atMax ? 'In your bag' : 'Add to cart'}
        </Button>
        <div className="flex gap-3">
          <Button variant="accent" size="lg" disabled={soldOut} onClick={onBuyNow} className="w-full">
            <Zap className="size-4" />
            Buy now
          </Button>
          <WishlistButton productId={product.id} productName={product.name} variant="outline" />
        </div>
      </div>
      {notice && <p className="mt-2 text-xs text-ink-muted">{notice}</p>}

      <ul className="mt-6 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-sand" /> Hand-inspected and graded
        </li>
        <li className="flex items-center gap-2">
          <Fingerprint className="size-4 text-sand" /> One of a kind: photographed as-is
        </li>
      </ul>

      {/* Condition + defects */}
      <section aria-labelledby="condition-heading" className="mt-10 border-t border-bone/10 pt-6">
        <h2
          id="condition-heading"
          className="mb-4 text-sm font-medium text-ink"
        >
          Condition
        </h2>
        <ConditionMeter grade={product.condition} />
      </section>

      <section aria-labelledby="defects-heading" className="mt-8">
        <h2
          id="defects-heading"
          className="mb-3 flex items-center justify-between text-sm font-medium text-ink"
        >
          Defect disclosure
          <span className="font-sans text-xs tracking-normal text-ink-subtle normal-case">
            {product.defects.length} recorded
          </span>
        </h2>
        <DefectList defects={product.defects} notes={product.conditionNotes} />
      </section>
    </div>
  )
}
