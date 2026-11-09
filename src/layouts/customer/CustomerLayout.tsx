import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/feedback/PageLoader'
import { paths } from '@/app/router/paths'
import { AddedToBagToast } from '@/features/cart/components/AddedToBagToast'
import { WishlistSync } from '@/features/wishlist/useWishlist'
import { SkyBackdrop } from '@/components/motion/Sparkles'
import { cn } from '@/lib/utils/cn'
import { CustomerFooter } from './CustomerFooter'
import { CustomerHeader } from './CustomerHeader'

/** Storefront shell: fixed navbar, footer, and a slot for customer pages. */
export function CustomerLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === paths.home

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <SkyBackdrop />
      <CustomerHeader />
      {/* The homepage hero sits under the transparent navbar. Other pages clear it. */}
      <main className={cn('flex-1', !isHome && 'pt-16 lg:pt-20')}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <CustomerFooter />
      <AddedToBagToast />
      <WishlistSync />
    </div>
  )
}
