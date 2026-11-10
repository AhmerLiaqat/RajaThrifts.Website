import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { AuthShell } from '../components/AuthShell'
import { authAvailable, useAuth, useSignUp } from '../hooks/useAuth'
import { registerSchema, type RegisterValues } from '../schemas'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const signUp = useSignUp()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  if (isAuthenticated && !signUp.isPending && !signUp.data) return <Navigate to={paths.account} replace />

  if (signUp.data?.needsEmailConfirmation) {
    return (
      <AuthShell eyebrow="Almost there" title="Check email">
        <div className="flex flex-col items-start gap-4">
          <MailCheck className="size-8 text-sand" aria-hidden />
          <p className="text-sm leading-relaxed text-bone/80">
            We sent a confirmation link to <span className="text-bone">{form.getValues('email')}</span>. Open
            it on this device to activate your account, then sign in.
          </p>
          <Link to={paths.login} className="text-sm text-sand underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = form.handleSubmit(({ fullName, email, phone, password }) =>
    signUp.mutate(
      { fullName, email, phone: phone || undefined, password },
      { onSuccess: (r) => r.user && navigate(from ?? paths.account, { replace: true }) },
    ),
  )

  const e = form.formState.errors
  return (
    <AuthShell eyebrow="Join Raja Thrifts" title="Register">
      {signUp.error && (
        <Alert tone="error" className="mb-6">
          {signUp.error.message}
        </Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Full name"
          autoComplete="name"
          error={e.fullName?.message}
          {...form.register('fullName')}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={e.email?.message}
          {...form.register('email')}
        />
        <Input
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          hint="Used for delivery updates. You can add it later."
          error={e.phone?.message}
          {...form.register('phone')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="8+ characters with a letter and a number"
            error={e.password?.message}
            {...form.register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={e.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
        </div>
        <Button type="submit" size="lg" loading={signUp.isPending} disabled={!authAvailable}>
          Create account
        </Button>
        <p className="text-xs leading-relaxed text-ink-subtle">
          New accounts are customer accounts. Staff access is granted by an admin.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          to={paths.login}
          state={location.state}
          className="text-sand underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
