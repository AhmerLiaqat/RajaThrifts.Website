import { Alert } from '@/components/ui/Field'

/** Shown wherever a feature needs the real backend while the app runs in demo mode. */
export function SupabaseNotice({ feature, className }: { feature: string; className?: string }) {
  return (
    <Alert tone="info" title={`${feature} needs Supabase`} className={className}>
      This preview is running on demo data. Add <code className="text-bone">VITE_SUPABASE_URL</code> and{' '}
      <code className="text-bone">VITE_SUPABASE_ANON_KEY</code> to{' '}
      <code className="text-bone">.env.local</code>, apply the SQL in{' '}
      <code className="text-bone">supabase/migrations</code>, then restart the dev server.
    </Alert>
  )
}
