import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ChevronRight, Heart, LayoutDashboard, Menu, PackageSearch, Search, ShoppingBag, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { COLLECTION_META } from '@/constants/collections'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCart } from '@/features/cart/store/cart-store'
import { useWishlist } from '@/features/wishlist/useWishlist'
import { SearchOverlay } from '@/features/search/SearchOverlay'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'

const collections = Object.values(COLLECTION_META).sort((a, b) => a.rank - b.rank)

const primaryLinks = [
  ...collections.map((c) => ({ to: paths.collection(c.slug), label: c.label })),
  { to: paths.shop, label: 'Shop all' },
]

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-extrabold tracking-tight', className)}>
      Raja<span className="text-sand">Thrifs</span>
    </span>
  )
}

export function CustomerHeader() {
  const { pathname } = useLocation()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const { count: cartCount } = useCart()
  const { count: wishlistCount } = useWishlist()
  // Customers shop as guests; only staff sign in, and they get a shortcut to the dashboard.
  const { isStaff } = useAuth()

  // Solid after leaving the top. Hide when scrolling down, reveal when scrolling up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setScrolled(y > 40)
    setHidden(y > prev && y > 400 && !menuOpen)
  })

  // Close the mobile menu on navigation.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
  }

  // Lock page scroll and allow Escape while the menu is open.
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const solid = scrolled || menuOpen

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? -120 : 0 }}
        transition={{ duration: 0.3, ease: m.ease.outExpo }}
        className="fixed inset-x-0 top-0 z-30"
      >
        <div
          className={cn(
            'border-b border-line bg-white/95 backdrop-blur-md transition-shadow duration-300',
            solid && 'shadow-[0_1px_8px_rgb(17_26_51/0.06)]',
          )}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[4.5rem] lg:gap-8 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="-ml-2 grid size-10 place-items-center rounded-lg text-ink hover:bg-surface-sunken lg:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <Link to={paths.home} aria-label="RajaThrifs home" className="shrink-0">
              <Wordmark className="text-lg text-ink sm:text-xl" />
            </Link>

            {/* Desktop search field: opens the full search overlay */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-11 flex-1 items-center gap-3 rounded-lg border border-line-strong bg-surface-sunken px-4 text-left text-sm text-ink-subtle transition-colors hover:border-ink-subtle lg:flex lg:max-w-xl"
            >
              <Search className="size-4 shrink-0" aria-hidden />
              Search brands, models, sizes…
            </button>

            <div className="ml-auto flex items-center gap-1 text-ink">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="grid size-10 place-items-center rounded-lg transition-colors hover:bg-surface-sunken lg:hidden"
              >
                <Search className="size-5" />
              </button>
              <Link
                to={isStaff ? paths.admin.root : paths.trackOrder}
                aria-label={isStaff ? 'Dashboard' : 'Track your order'}
                title={isStaff ? 'Dashboard' : 'Track your order'}
                className="hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-sunken sm:flex"
              >
                {isStaff ? <LayoutDashboard className="size-5" /> : <PackageSearch className="size-5" />}
                <span className="hidden xl:inline">{isStaff ? 'Dashboard' : 'Track order'}</span>
              </Link>
              <Link
                to={paths.wishlist}
                aria-label={`Wishlist, ${wishlistCount} saved`}
                className="relative hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-sunken sm:flex"
              >
                <Heart className="size-5" />
                <span className="hidden xl:inline">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-sand-100 px-1 text-[11px] font-semibold text-sand">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to={paths.cart}
                aria-label={`Bag, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                className="relative flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-surface-sunken sm:px-3"
              >
                <ShoppingBag className="size-5" />
                <span className="hidden xl:inline">Bag</span>
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-0.5 right-0.5 grid min-w-[18px] place-items-center rounded-full bg-sand px-1 text-[10px] leading-[18px] font-bold text-white xl:static xl:text-[11px]"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>
          </div>

          {/* Desktop category bar */}
          <nav aria-label="Primary" className="hidden border-t border-line lg:block">
            <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
              {primaryLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-full items-center px-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-sand after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-sand'
                        : 'text-ink-muted hover:text-ink',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <span className="ml-auto text-sm text-ink-subtle">
                Imported thrift footwear · Hand-graded · Delivered nationwide
              </span>
            </div>
          </nav>
        </div>
      </motion.header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 flex flex-col overflow-y-auto bg-white px-4 pt-20 pb-8 sm:px-6 lg:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col gap-2">
              {primaryLinks.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.03 * i, duration: 0.2 }}
                >
                  <Link
                    to={l.to}
                    className="flex items-center justify-between border-b border-line py-4 text-lg font-semibold text-ink"
                  >
                    {l.label}
                    <ChevronRight className="size-5 text-ink-subtle" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-8 grid grid-cols-2 gap-3 text-sm font-medium text-ink"
            >
              <Link to={paths.wishlist} className="flex h-12 items-center gap-2 rounded-lg border border-line px-4 hover:bg-surface-sunken">
                <Heart className="size-4" /> Wishlist
              </Link>
              <Link to={paths.cart} className="flex h-12 items-center gap-2 rounded-lg border border-line px-4 hover:bg-surface-sunken">
                <ShoppingBag className="size-4" /> Bag
              </Link>
              <Link to={paths.trackOrder} className="flex h-12 items-center gap-2 rounded-lg border border-line px-4 hover:bg-surface-sunken">
                <PackageSearch className="size-4" /> Track order
              </Link>
              {isStaff && (
                <Link to={paths.admin.root} className="flex h-12 items-center gap-2 rounded-lg border border-line px-4 hover:bg-surface-sunken">
                  <LayoutDashboard className="size-4" /> Dashboard
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
