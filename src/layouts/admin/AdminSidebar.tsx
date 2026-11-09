import { LogOut, Store } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { env } from '@/config/env'
import { useDashboardSummary } from '@/features/admin/hooks'
import { useAuth, useSignOut } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils/cn'
import { DASHBOARD_NAV, type NavBadgeKey } from './adminNav'

function useNavBadges(): Partial<Record<NavBadgeKey, number>> {
  const summary = useDashboardSummary(30)
  if (!env.isSupabaseConfigured || !summary.data) return {}
  return {
    pendingOrders: summary.data.pendingOrders,
    openReturns: summary.data.openReturns,
    lowStock: summary.data.inventory.lowStock,
    // Delivered orders still awaiting payment, i.e. COD the courier has not settled yet.
    pendingCod: summary.data.unpaidDelivered,
  }
}

/** Navigation + account footer. Rendered in the desktop sidebar and the mobile drawer. */
export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasRole } = useAuth()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const badges = useNavBadges()

  return (
    <div className="flex h-full flex-col">
      <Link
        to={paths.admin.root}
        onClick={onNavigate}
        className="px-5 py-5 font-display text-lg font-bold text-white"
      >
        Raja<span className="text-sand">Thrifs</span>
        <span className="mt-0.5 block text-[10px] font-medium tracking-[0.3em] text-admin-sidebar-text/60 uppercase">
          Shop dashboard
        </span>
      </Link>

      <nav aria-label="Dashboard" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {DASHBOARD_NAV.map((group) => {
          const items = group.items.filter((i) => hasRole(i.roles))
          if (!items.length) return null
          return (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] tracking-[0.24em] text-admin-sidebar-text/50 uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end, badge }) => {
                  const count = badge ? badges[badge] : undefined
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                            isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white',
                          )
                        }
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {!!count && (
                          <span
                            className="min-w-5 rounded-full bg-sand px-1.5 text-center text-[10px] leading-5 font-semibold text-night"
                            aria-label={`${count} need attention`}
                          >
                            {count}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        {user && (
          <div className="px-3 py-2">
            <p className="truncate text-sm text-white">{user.fullName ?? user.email}</p>
            <p className="text-[10px] tracking-[0.24em] text-sand uppercase">{user.role}</p>
          </div>
        )}
        <Link
          to={paths.home}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-white/5 hover:text-white"
        >
          <Store className="size-4" /> View store
        </Link>
        <button
          type="button"
          onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate(paths.login) })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 bg-admin-sidebar text-admin-sidebar-text lg:block">
      <DashboardNav />
    </aside>
  )
}
