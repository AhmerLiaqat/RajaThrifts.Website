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
        className="flex items-center gap-3 px-5 py-5"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-gold font-display text-sm font-extrabold text-brand-navy">
          RT
        </span>
        <span className="leading-tight">
          <span className="block font-display text-base font-bold text-white">
            Raja<span className="text-gold">Thrifs</span>
          </span>
          <span className="block text-xs text-admin-sidebar-text/70">Shop dashboard</span>
        </span>
      </Link>

      <nav aria-label="Dashboard" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {DASHBOARD_NAV.map((group) => {
          const items = group.items.filter((i) => hasRole(i.roles))
          if (!items.length) return null
          return (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-admin-sidebar-text/50 uppercase">
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
                            'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-white/12 text-white before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-gold'
                              : 'hover:bg-white/6 hover:text-white',
                          )
                        }
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {!!count && (
                          <span
                            className="min-w-5 rounded-full bg-gold px-1.5 text-center text-[11px] leading-5 font-bold text-brand-navy"
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

      <div className="border-t border-white/10 p-3">
        {user && (
          <div className="px-3 py-2">
            <p className="truncate text-sm text-white">{user.fullName ?? user.email}</p>
            <p className="text-xs text-gold capitalize">{user.role}</p>
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
