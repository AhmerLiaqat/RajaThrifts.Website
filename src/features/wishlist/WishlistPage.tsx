import { Heart } from 'lucide-react'
import { paths } from '@/app/router/paths'
import { MaskedText } from '@/components/motion/MaskedText'
import { ButtonLink } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { env } from '@/config/env'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/components/ProductGrid'
import { useWishlist, useWishlistProducts } from './useWishlist'

export default function WishlistPage() {
  const { count, isRemote } = useWishlist()
  const products = useWishlistProducts()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <p className="eyebrow">
        Saved pairs · {count} {isRemote ? '· synced to your account' : '· this device'}
      </p>
      <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-tight text-ink sm:text-4xl">
        <MaskedText immediate lines={[{ text: 'Wishlist' }]} />
      </h1>


      <div className="mt-12">
        {products.isPending ? (
          <ProductGridSkeleton count={4} />
        ) : products.error ? (
          <Alert tone="error">{products.error.message}</Alert>
        ) : !products.data?.length ? (
          <div className="flex flex-col items-center rounded-sm border border-dashed border-bone/15 px-6 py-20 text-center">
            <Heart className="size-8 text-sand" aria-hidden />
            <p className="mt-5 text-xl font-semibold uppercase">Nothing saved yet</p>
            <p className="mt-2 text-sm text-ink-muted">Tap the heart on any pair to keep it here.</p>
            <ButtonLink to={paths.shop} className="mt-8">
              Browse pairs
            </ButtonLink>
          </div>
        ) : (
          <ProductGrid products={products.data} isDemo={env.useDemoCatalog} />
        )}
      </div>
    </div>
  )
}
