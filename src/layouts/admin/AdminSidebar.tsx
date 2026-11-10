import { ChevronDown, ExternalLink, LogOut, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { env } from '@/config/env'
import { useDashboardSummary } from '@/features/admin/hooks'
import { useAuth, useSignOut } from '@/features/auth/hooks/useAuth'
import { LogoMark, LogoWordmarkDark } from '@/components/brand/Logo'
import { cn } from '@/lib/utils/cn'
import { DASHBOARD_NAV, type NavBadgeKey, type NavItem } from './adminNav'

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

const STORAGE_KEY = 'rt.sidebar.collapsed'

function readCollapsed(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Which groups the user folded away. Remembered per browser. */
function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed)
  const toggle = (label: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable: keep in memory only */
      }
      return next
    })
  return { collapsed, toggle }
}

const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

function NavRow({
  item,
  count,
  onNavigate,
}: {
  item: NavItem
  count?: number
  onNavigate?: () => void
}) {
  const { to, label, icon: Icon, end } = item
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group/nav relative flex items-center gap-3 rounded-xl py-1 pr-2.5 pl-1 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-white text-brand-navy shadow-[0_6px_16px_-6px_rgb(0_0_0/0.45)]'
            : 'text-admin-sidebar-text hover:bg-white/[0.07] hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-[9px] transition-colors',
              isActive
                ? 'bg-brand-navy text-gold'
                : 'bg-white/[0.06] text-admin-sidebar-text/80 group-hover/nav:bg-white/10 group-hover/nav:text-white',
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="flex-1 truncate">{label}</span>
          {!!count && (
            <span
              className={cn(
                'min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-bold tabular-nums',
                isActive ? 'bg-gold/20 text-[#8a6514]' : 'bg-gold text-brand-navy',
              )}
              aria-label={`${count} need attention`}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

/** Navigation + account footer. Rendered in the desktop sidebar and the mobile drawer. */
export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasRole } = useAuth()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const badges = useNavBadges()
  const { collapsed, toggle } = useCollapsedGroups()
  const displayName = user?.fullName ?? user?.email ?? 'Staff'

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#1a2456] via-admin-sidebar to-[#0d1433]">
      {/* Soft brand glow behind the logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-[#3a4fb8]/30 blur-3xl"
      />

      {/* Brand */}
      <div className="relative px-4 pt-5 pb-4">
        <Link
          to={paths.admin.root}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/5 max-lg:mr-8"
        >
          <LogoMark title="" className="size-12" />
          <span className="min-w-0 leading-tight">
            <LogoWordmarkDark className="h-9" />
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-admin-sidebar-text/70">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              Shop dashboard
            </span>
          </span>
        </Link>

        <Link
          to={paths.admin.productNew}
          onClick={onNavigate}
          className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-brand-navy shadow-[0_8px_20px_-8px_rgb(201_154_46/0.8)] transition-colors hover:bg-[#d8ab43]"
        >
          <Plus className="size-4" strokeWidth={2.5} aria-hidden /> Add product
        </Link>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Navigation */}
      <nav
        aria-label="Dashboard"
        className="sidebar-scroll relative flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {DASHBOARD_NAV.map((group) => {
          const items = group.items.filter((i) => hasRole(i.roles))
          if (!items.length) return null

          // A single-item group (Overview) needs no heading.
          if (items.length === 1 && group.label === 'Overview') {
            return (
              <div key={group.label} className="pb-2">
                <NavRow item={items[0]} onNavigate={onNavigate} />
              </div>
            )
          }

          const containsActive = items.some((i) =>
            i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`),
          )
          const open = containsActive || !collapsed.includes(group.label)
          const groupCount = items.reduce((n, i) => n + (i.badge ? (badges[i.badge] ?? 0) : 0), 0)
          const listId = `nav-group-${group.label.toLowerCase()}`

          return (
            <div key={group.label} className="pt-1">
              <button
                type="button"
                onClick={() => toggle(group.label)}
                aria-expanded={open}
                aria-controls={listId}
                disabled={containsActive}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-admin-sidebar-text/55 uppercase transition-colors hover:text-white disabled:cursor-default disabled:hover:text-admin-sidebar-text/55"
              >
                <span className="flex-1 text-left">{group.label}</span>
                {!open && groupCount > 0 && (
                  <span className="size-1.5 rounded-full bg-gold" aria-label={`${groupCount} need attention`} />
                )}
                {!containsActive && (
                  <ChevronDown
                    className={cn('size-3.5 transition-transform duration-200', !open && '-rotate-90')}
                    aria-hidden
                  />
                )}
              </button>
              <div
                id={listId}
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <ul className="space-y-0.5 overflow-hidden pt-0.5 pb-2" inert={!open || undefined}>
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavRow
                        item={item}
                        count={item.badge ? badges[item.badge] : undefined}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Account */}
      <div className="relative p-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#4a5fc8] to-[#2a3a8f] text-xs font-bold text-white ring-2 ring-white/15">
              {initials(displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              {user && (
                <span className="mt-0.5 inline-flex rounded-md bg-gold/15 px-1.5 text-[11px] font-semibold text-gold capitalize">
                  {user.role}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <Link
              to={paths.home}
              onClick={onNavigate}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] text-xs font-medium text-admin-sidebar-text transition-colors hover:bg-white/12 hover:text-white"
            >
              <ExternalLink className="size-3.5" aria-hidden /> View store
            </Link>
            <button
              type="button"
              onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate(paths.login) })}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] text-xs font-medium text-admin-sidebar-text transition-colors hover:bg-red-500/20 hover:text-red-200"
            >
              <LogOut className="size-3.5" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 border-r border-black/20 lg:block">
      <DashboardNav />
    </aside>
  )
}
