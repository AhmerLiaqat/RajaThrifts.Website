import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/feedback/PageLoader'
import { WhatsAppFloat } from '@/components/feedback/WhatsAppFloat'
import { AddedToBagToast } from '@/features/cart/components/AddedToBagToast'
import { WishlistSync } from '@/features/wishlist/useWishlist'
import { CustomerFooter } from './CustomerFooter'
import { CustomerHeader } from './CustomerHeader'

/** Storefront shell: fixed navbar, footer, and a slot for customer pages. */
export function CustomerLayout() {
  const { pathname } = useLocation()

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-surface">
      <CustomerHeader />
      {/* Every page clears the fixed navbar. */}
      <main className="flex-1 pt-16 lg:pt-[7.5rem]">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <CustomerFooter />
      <AddedToBagToast />
      <WhatsAppFloat />
      <WishlistSync />
    </div>
  )
}
