import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { useSeo } from '@/lib/seo/useSeo'
import { authService } from '@/services'
import { AuthShell } from '../components/AuthShell'
import { authAvailable, useAuth, useSignIn, useSignOut } from '../hooks/useAuth'
import { loginSchema, type LoginValues } from '../schemas'

/** Turns Supabase auth errors into something a shop owner can act on. */
function explain(message: string): { title: string; body: string; unconfirmed?: boolean } {
  if (/email not confirmed/i.test(message))
    return {
      title: 'Email not confirmed yet',
      body: 'Open the confirmation link Supabase emailed you (check spam), then sign in. You can resend it below.',
      unconfirmed: true,
    }
  if (/invalid login credentials/i.test(message))
    return {
      title: 'Email or password is wrong',
      body: 'Check both and try again. If you never registered this email, register it first.',
    }
  if (/too many|rate limit/i.test(message))
    return { title: 'Too many attempts', body: 'Please wait a minute and try again.' }
  if (/fetch|network/i.test(message))
    return {
      title: 'Cannot reach Supabase',
      body: 'Check your internet connection and the Supabase URL in .env.local, then restart npm run dev.',
    }
  return { title: 'Could not sign in', body: message }
}

/** Staff sign-in. Customers never need an account (guest checkout). */
export default function LoginPage() {
  useSeo({ title: 'Admin login', noindex: true })
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user, isAuthenticated, isStaff } = useAuth()
  const signIn = useSignIn()
  const signOut = useSignOut()
  const resend = useMutation({ mutationFn: (email: string) => authService.resendConfirmation(email) })

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated && isStaff && !signIn.isPending)
    return <Navigate to={from?.startsWith('/dashboard') ? from : paths.admin.root} replace />

  // Signed in, but the account has no staff role: say so instead of silently redirecting.
  if (isAuthenticated && !isStaff && !signIn.isPending) {
    return (
      <AuthShell eyebrow="Admin only" title="No admin access">
        <Alert tone="info" title={`Signed in as ${user?.email ?? 'this account'}`}>
          This account is not an admin, so the dashboard is locked.
        </Alert>
        <div className="mt-6 space-y-3 text-sm text-ink-muted">
          <p>
            <strong className="text-bone">First admin:</strong> in Supabase → SQL Editor, run:
          </p>
          <pre className="overflow-x-auto rounded-xl border border-bone/10 bg-night/50 p-3 font-mono text-xs text-bone">
            {`update public.profiles set role = 'admin'\nwhere email = '${user?.email ?? 'you@example.com'}';`}
          </pre>
          <p>Then sign out and sign in again.</p>
        </div>
        <Button className="mt-6" variant="outline" loading={signOut.isPending} onClick={() => signOut.mutate()}>
          Sign out
        </Button>
      </AuthShell>
    )
  }

  const onSubmit = form.handleSubmit((values) =>
    signIn.mutate(values, {
      onSuccess: (u) => {
        if (u.role !== 'customer') navigate(from?.startsWith('/dashboard') ? from : paths.admin.root, { replace: true })
      },
    }),
  )
  const problem = signIn.error ? explain(signIn.error.message) : null

  return (
    <AuthShell eyebrow="Admin only" title="Admin login">
      <p className="-mt-2 mb-6 text-sm text-ink-muted">
        Shopping? No account needed: just add pairs to your bag and check out.{' '}
        <Link to={paths.trackOrder} className="text-sand underline-offset-4 hover:underline">
          Track an order
        </Link>
      </p>

      {!authAvailable && (
        <Alert tone="error" title="Supabase is not connected" className="mb-6">
          Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the .env.local file (not .env.example), then stop and
          restart npm run dev.
        </Alert>
      )}
      {params.get('confirmed') && (
        <Alert tone="success" title="Email confirmed" className="mb-6">
          Your account is ready. Sign in to continue.
        </Alert>
      )}
      {problem && (
        <Alert tone="error" title={problem.title} className="mb-6">
          {problem.body}
          {problem.unconfirmed && (
            <span className="mt-3 block">
              {resend.isSuccess ? (
                <span className="text-success">Confirmation email sent. Check your inbox and spam folder.</span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={resend.isPending}
                  onClick={() => resend.mutate(form.getValues('email'))}
                >
                  Resend confirmation email
                </Button>
              )}
              {resend.error && <span className="mt-2 block">{resend.error.message}</span>}
            </span>
          )}
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <div className="flex justify-end">
          <Link
            to={paths.resetPassword}
            className="text-xs text-ink-muted underline-offset-4 hover:text-bone hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" loading={signIn.isPending} disabled={!authAvailable}>
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-ink-subtle">
        This sign-in is for the store admin only. Customers don&apos;t need an account: just shop and check out.
      </p>
    </AuthShell>
  )
}
