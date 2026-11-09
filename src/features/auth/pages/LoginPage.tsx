import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { AuthShell } from '../components/AuthShell'
import { authAvailable, useAuth, useSignIn } from '../hooks/useAuth'
import { loginSchema, type LoginValues } from '../schemas'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { isAuthenticated, isStaff } = useAuth()
  const signIn = useSignIn()

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated && !signIn.isPending)
    return <Navigate to={from ?? (isStaff ? paths.admin.root : paths.account)} replace />

  const onSubmit = form.handleSubmit((values) =>
    signIn.mutate(values, {
      onSuccess: (user) =>
        navigate(from ?? (user.role === 'customer' ? paths.account : paths.admin.root), { replace: true }),
    }),
  )

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in">
      {params.get('confirmed') && (
        <Alert tone="success" title="Email confirmed" className="mb-6">
          Your account is ready. Sign in to continue.
        </Alert>
      )}
      {signIn.error && (
        <Alert tone="error" className="mb-6">
          {signIn.error.message === 'Invalid login credentials'
            ? 'That email and password do not match. Please try again.'
            : signIn.error.message}
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

      <p className="mt-8 text-center text-sm text-ink-muted">
        New to RajaThrifs?{' '}
        <Link
          to={paths.register}
          state={location.state}
          className="text-sand underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
