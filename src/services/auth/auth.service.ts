import type { User } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { getSupabase } from '@/lib/supabase/client'
import type { AppUser, SignUpInput } from '@/types/auth'
import { fromAuthError, ServiceError } from '../core/errors'
import { profileService } from './profile.service'

/**
 * The role ALWAYS comes from public.profiles (protected by RLS + column grants),
 * never from user_metadata, which users can edit themselves.
 */
async function toAppUser(user: User): Promise<AppUser> {
  const profile = await profileService.getById(user.id).catch(() => null)
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.fullName ?? null,
    role: profile?.role ?? 'customer',
  }
}

export type SignUpResult =
  { user: AppUser; needsEmailConfirmation: false } | { user: null; needsEmailConfirmation: true }

export interface AuthService {
  getCurrentUser(): Promise<AppUser | null>
  signUp(input: SignUpInput): Promise<SignUpResult>
  signInWithPassword(email: string, password: string): Promise<AppUser>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  onAuthChange(cb: (event: string) => void): () => void
}

export const authService: AuthService = {
  async getCurrentUser() {
    // getUser() validates the session with the auth server (getSession() only reads storage).
    const { data, error } = await getSupabase().auth.getUser()
    if (error || !data.user) return null
    return toAppUser(data.user)
  },

  async signUp({ email, password, fullName, phone }) {
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Read once by the handle_new_user trigger to seed public.profiles.
        data: { full_name: fullName.trim(), phone: phone?.trim() || undefined },
        emailRedirectTo: `${env.appUrl}/login?confirmed=1`,
      },
    })
    if (error) throw fromAuthError(error)
    if (!data.user) throw new ServiceError('UNKNOWN', 'Sign up failed. Please try again.')
    // With email confirmation on (recommended), there is no session until the link is clicked.
    if (!data.session) return { user: null, needsEmailConfirmation: true }
    return { user: await toAppUser(data.user), needsEmailConfirmation: false }
  },

  async signInWithPassword(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw fromAuthError(error)
    return toAppUser(data.user)
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut()
    if (error) throw fromAuthError(error)
  },

  async requestPasswordReset(email) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${env.appUrl}/reset-password`,
    })
    if (error) throw fromAuthError(error)
  },

  async updatePassword(password) {
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw fromAuthError(error)
  },

  onAuthChange(cb) {
    const { data } = getSupabase().auth.onAuthStateChange((event) => {
      // Defer: Supabase recommends not awaiting other client calls inside this callback.
      setTimeout(() => cb(event), 0)
    })
    return () => data.subscription.unsubscribe()
  },
}
