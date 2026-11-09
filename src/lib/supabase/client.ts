import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { ServiceError } from '@/services/core/errors'

let client: SupabaseClient | null = null

/**
 * Lazily creates the single browser Supabase client (anon / publishable key only).
 * Authorization is enforced by Postgres Row Level Security; this key grants nothing
 * beyond what the policies in supabase/migrations allow for the signed-in user.
 *
 * Only the service layer (src/services) should call this.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new ServiceError(
      'NOT_CONFIGURED',
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    )
  }

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // PKCE: email confirmation links return a one-time code instead of tokens in the URL.
      flowType: 'pkce',
    },
    global: { headers: { 'x-application-name': 'rajathrifs-web' } },
  })
  return client
}
