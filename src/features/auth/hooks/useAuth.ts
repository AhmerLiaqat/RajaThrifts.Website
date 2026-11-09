import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { env } from '@/config/env'
import { queryKeys } from '@/lib/query/queryClient'
import { authService } from '@/services'
import { STAFF_ROLES, type AppUser, type SignUpInput, type UserRole } from '@/types/auth'

const DEV_ADMIN: AppUser = { id: 'dev-admin', email: 'dev@local', fullName: 'Dev Admin', role: 'admin' }

/** True when real authentication is available. */
export const authAvailable = env.isSupabaseConfigured

/**
 * Current user + role, kept in sync with Supabase auth events (sign in/out,
 * token refresh, other tabs). Role is read from public.profiles.
 */
export function useAuth() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      if (env.devAdminBypass) return DEV_ADMIN
      if (!env.isSupabaseConfigured) return null
      return authService.getCurrentUser()
    },
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (env.devAdminBypass || !env.isSupabaseConfigured) return
    return authService.onAuthChange((event) => {
      if (event === 'TOKEN_REFRESHED') return
      qc.invalidateQueries({ queryKey: queryKeys.auth.user })
      if (event === 'SIGNED_OUT') {
        // Drop everything user-specific from the cache.
        qc.removeQueries({ queryKey: queryKeys.orders.all })
        qc.removeQueries({ queryKey: queryKeys.wishlist.all })
        qc.removeQueries({ queryKey: ['profile'] })
        qc.removeQueries({ queryKey: ['admin'] })
      }
    })
  }, [qc])

  const user = query.data ?? null
  const hasRole = (roles: readonly UserRole[]) => !!user && roles.includes(user.role)

  return {
    user,
    isLoading: query.isPending,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    hasRole,
    isStaff: hasRole(STAFF_ROLES),
    isAdmin: hasRole(['admin']),
  }
}

export function useSignIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signInWithPassword(email, password),
    onSuccess: (user) => qc.setQueryData(queryKeys.auth.user, user),
  })
}

export function useSignUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SignUpInput) => authService.signUp(input),
    onSuccess: (result) => {
      if (result.user) qc.setQueryData(queryKeys.auth.user, result.user)
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => qc.setQueryData(queryKeys.auth.user, null),
  })
}
