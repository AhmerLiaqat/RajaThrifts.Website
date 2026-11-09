import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowUpRight, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
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
    <span className={cn('font-display font-semibold tracking-[0.34em] uppercase', className)}>
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
  const { user, isAuthenticated } = useAuth()

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
        initial={{ y: -100 }}
        animate={{ y: hidden ? -100 : 0 }}
        transition={{ duration: 0.6, ease: m.ease.outExpo }}
        className="fixed inset-x-0 top-0 z-30"
      >
        <div
          className={cn(
            'transition-[background-color,border-color,backdrop-filter] duration-500',
            solid
              ? 'border-b border-bone/8 bg-night/90 backdrop-blur-xl'
              : 'border-b border-transparent bg-gradient-to-b from-night/70 to-transparent',
          )}
        >
          <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:h-20 lg:px-10">
            {/* Left: desktop nav or mobile trigger */}
            <nav aria-label="Primary" className="hidden items-center gap-8 whitespace-nowrap xl:flex">
              {primaryLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'group relative font-display text-[11px] tracking-[0.24em] uppercase transition-colors',
                      isActive ? 'text-bone' : 'text-bone/60 hover:text-bone',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {l.label}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute -bottom-1.5 left-0 h-px w-full origin-left bg-sand transition-transform duration-500 ease-out-expo',
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                        )}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="-ml-2 grid size-10 place-items-center text-bone xl:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <Link to={paths.home} aria-label="RajaThrifs home" className="justify-self-center">
              <Wordmark className="text-sm text-bone sm:text-base" />
            </Link>

            <div className="flex items-center justify-end gap-1 text-bone sm:gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="grid size-10 place-items-center rounded-full transition-colors hover:bg-bone/10"
              >
                <Search className="size-[18px]" />
              </button>
              <Link
                to={paths.wishlist}
                aria-label={`Wishlist, ${wishlistCount} saved`}
                className="relative hidden size-10 place-items-center rounded-full transition-colors hover:bg-bone/10 sm:grid"
              >
                <Heart className="size-[18px]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-2 right-2 size-1.5 rounded-full bg-sand" aria-hidden />
                )}
              </Link>
              <Link
                to={isAuthenticated ? paths.account : paths.login}
                aria-label={isAuthenticated ? 'Your account' : 'Sign in'}
                title={user?.email ?? 'Sign in'}
                className="hidden size-10 place-items-center rounded-full transition-colors hover:bg-bone/10 sm:grid"
              >
                {isAuthenticated ? (
                  <span className="grid size-7 place-items-center rounded-full bg-sand font-display text-[11px] font-semibold text-night uppercase">
                    {(user?.fullName ?? user?.email ?? '?').charAt(0)}
                  </span>
                ) : (
                  <User className="size-[18px]" />
                )}
              </Link>
              <Link
                to={paths.cart}
                aria-label={`Bag, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
                className="relative grid size-10 place-items-center rounded-full transition-colors hover:bg-bone/10"
              >
                <ShoppingBag className="size-[18px]" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-sand font-display text-[9px] font-semibold text-night"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.8, ease: m.ease.outExpo }}
            className="grain fixed inset-0 z-20 flex flex-col overflow-hidden bg-night px-6 pt-28 pb-10 xl:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col gap-2">
              {primaryLinks.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.8, ease: m.ease.outExpo }}
                >
                  <Link
                    to={l.to}
                    className="flex items-baseline justify-between border-b border-bone/10 py-4 font-display text-4xl font-semibold tracking-tight text-bone uppercase"
                  >
                    {l.label}
                    <ArrowUpRight className="size-5 text-sand" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-auto flex gap-6 font-display text-xs tracking-[0.24em] text-bone/60 uppercase"
            >
              <Link to={paths.wishlist}>Wishlist</Link>
              <Link to={paths.cart}>Bag</Link>
              {isAuthenticated ? (
                <Link to={paths.account}>Account</Link>
              ) : (
                <Link to={paths.login}>Sign in</Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
