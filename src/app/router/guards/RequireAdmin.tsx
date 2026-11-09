import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/feedback/PageLoader'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { STAFF_ROLES, type UserRole } from '@/types/auth'
import { paths } from '../paths'

/**
 * Client-side gates. These are UX only: real protection comes from Row Level
 * Security and the role checks inside every database function.
 */

/** Signed-in users only; otherwise send to /login and come back afterwards. */
export function RequireAuth() {
  const { isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to={paths.login} replace state={{ from: location }} />
  return <Outlet />
}

/** Users holding one of `roles`. Signed-in users without the role go home. */
export function RequireRole({ roles }: { roles: readonly UserRole[] }) {
  const { isLoading, isAuthenticated, hasRole } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to={paths.login} replace state={{ from: location }} />
  if (!hasRole(roles)) return <Navigate to={paths.home} replace />
  return <Outlet />
}

/** Back office: shopkeepers and admins. */
export function RequireAdmin() {
  return <RequireRole roles={STAFF_ROLES} />
}
