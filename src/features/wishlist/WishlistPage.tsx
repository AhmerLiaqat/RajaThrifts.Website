import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { MaskedText } from '@/components/motion/MaskedText'
import { ButtonLink } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { env } from '@/config/env'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog/components/ProductGrid'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useWishlist, useWishlistProducts } from './useWishlist'

export default function WishlistPage() {
  const { isAuthenticated } = useAuth()
  const { count, isRemote } = useWishlist()
  const products = useWishlistProducts()

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <p className="eyebrow">
        Saved pairs · {count} {isRemote ? '· synced to your account' : '· this device'}
      </p>
      <h1 className="mt-5 text-[clamp(3rem,8vw,7rem)] leading-[0.88] font-semibold tracking-[-0.04em] uppercase">
        <MaskedText immediate lines={[{ text: 'Wishlist' }]} />
      </h1>

      {!isAuthenticated && env.isSupabaseConfigured && !env.useDemoCatalog && (
        <Alert tone="info" className="mt-8 max-w-2xl">
          Saved on this device only.{' '}
          <Link to={paths.login} className="text-bone underline underline-offset-4">
            Sign in
          </Link>{' '}
          to keep your wishlist across devices; we’ll add these pairs to your account.
        </Alert>
      )}

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
