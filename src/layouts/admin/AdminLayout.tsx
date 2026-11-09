import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { PageLoader } from '@/components/feedback/PageLoader'
import { SupabaseNotice } from '@/components/feedback/SupabaseNotice'
import { env } from '@/config/env'
import { motion as m } from '@/theme/tokens'
import { AdminSidebar, DashboardNav } from './AdminSidebar'

/**
 * Shopkeeper dashboard shell: its own layout (no storefront header/footer),
 * rendered behind RequireAdmin (shopkeeper + admin). Sidebar on desktop,
 * slide-out drawer on mobile.
 */
export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh bg-surface-sunken">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-bone/10 bg-admin-sidebar/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="-ml-1 p-1.5 text-bone"
          >
            <Menu className="size-5" />
          </button>
          <Link to={paths.admin.root} className="font-display text-sm font-bold tracking-wide text-white">
            Raja<span className="text-sand">Thrifs</span> · Dashboard
          </Link>
          <span className="w-7" />
        </header>

        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <motion.div
                className="absolute inset-0 bg-night/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.aside
                role="dialog"
                aria-label="Dashboard menu"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.4, ease: m.ease.outExpo }}
                className="absolute inset-y-0 left-0 w-72 bg-admin-sidebar text-admin-sidebar-text"
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="absolute top-4 right-3 p-1.5 text-bone"
                >
                  <X className="size-5" />
                </button>
                <DashboardNav onNavigate={() => setOpen(false)} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {!env.isSupabaseConfigured && <SupabaseNotice feature="The dashboard" className="mb-8" />}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
