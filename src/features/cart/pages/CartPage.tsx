import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { MaskedText } from '@/components/motion/MaskedText'
import { ButtonLink } from '@/components/ui'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { formatPrice, formatPriceCode } from '@/lib/utils/format'
import { cartStore, useCart } from '../store/cart-store'

export default function CartPage() {
  const { items, count, subtotal } = useCart()

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <p className="eyebrow">
        Your bag · {count} {count === 1 ? 'pair' : 'pairs'}
      </p>
      <h1 className="mt-5 text-[clamp(3rem,8vw,7rem)] leading-[0.88] font-semibold tracking-[-0.04em] uppercase">
        <MaskedText immediate lines={[{ text: 'Bag' }]} />
      </h1>

      {items.length === 0 ? (
        <div className="mt-14 flex flex-col items-center rounded-sm border border-dashed border-bone/15 px-6 py-20 text-center">
          <ShoppingBag className="size-8 text-sand" aria-hidden />
          <p className="mt-5 text-xl font-semibold uppercase">Your bag is empty</p>
          <p className="mt-2 text-sm text-ink-muted">One-of-a-kind pairs go fast. Find yours.</p>
          <ButtonLink to={paths.shop} variant="primary" className="mt-8">
            Shop all pairs
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-bone/10 border-y border-bone/10">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 py-6 sm:gap-6">
                <Link to={paths.product(item.slug)} className="shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="aspect-[4/5] w-24 rounded-sm object-cover sm:w-32"
                    />
                  ) : (
                    <div className="aspect-[4/5] w-24 rounded-sm bg-carbon sm:w-32" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-display text-[11px] tracking-[0.24em] text-ink-subtle uppercase">
                        {item.brand}
                      </p>
                      <Link
                        to={paths.product(item.slug)}
                        className="mt-1 block font-display text-lg leading-tight hover:text-sand"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink-muted">
                        {item.sizeLabel} · <span className="font-mono">{item.sku}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cartStore.remove(item.variantId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-ink-muted hover:text-bone"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                    <div className="flex items-center gap-3">
                      <CollectionBadge collection={item.collection} />
                      {item.maxQuantity > 1 && (
                        <div className="flex items-center rounded-full border border-bone/15">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => cartStore.setQuantity(item.variantId, item.quantity - 1)}
                            className="grid size-8 place-items-center"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            disabled={item.quantity >= item.maxQuantity}
                            onClick={() => cartStore.setQuantity(item.variantId, item.quantity + 1)}
                            className="grid size-8 place-items-center disabled:opacity-30"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="font-display tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-sm border border-bone/10 bg-carbon p-6 lg:sticky lg:top-28">
            <p className="font-display text-xs tracking-[0.24em] uppercase">Summary</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPriceCode(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="text-ink-muted">Calculated at checkout</dd>
              </div>
            </dl>
            <ButtonLink to={paths.checkout} variant="accent" size="lg" className="mt-8 w-full">
              Checkout
            </ButtonLink>
            <Link
              to={paths.shop}
              className="mt-4 block text-center text-xs text-ink-muted underline underline-offset-4 hover:text-bone"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}
