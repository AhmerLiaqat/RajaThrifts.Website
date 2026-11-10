import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { storeService } from '@/services/store/store.service'

export const publicSettingsKey = ['store', 'public-settings'] as const

/** Bank + WhatsApp details for the storefront. Disabled until Supabase is configured. */
export const usePublicSettings = () =>
  useQuery({
    queryKey: publicSettingsKey,
    queryFn: storeService.publicSettings,
    enabled: env.isSupabaseConfigured,
    staleTime: 5 * 60_000,
  })
