import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { paths } from '@/app/router/paths'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { authService } from '@/services'
import { AuthShell } from '../components/AuthShell'
import { authAvailable, useAuth } from '../hooks/useAuth'
import { emailSchema, newPasswordSchema } from '../schemas'

/**
 * Two steps on one route:
 *  1. Signed out → request a reset email.
 *  2. Arrived from the email link (Supabase signs the user in) → choose a new password.
 */
export default function ResetPasswordPage() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <SetNewPassword /> : <RequestReset />
}

function RequestReset() {
  const form = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: emailSchema })) })
  const request = useMutation({ mutationFn: (email: string) => authService.requestPasswordReset(email) })

  return (
    <AuthShell eyebrow="Account recovery" title="Reset">
      {request.isSuccess ? (
        <Alert tone="success" title="Check your inbox">
          If an account exists for that email, a reset link is on its way.
        </Alert>
      ) : (
        <form
          onSubmit={form.handleSubmit(({ email }) => request.mutate(email))}
          noValidate
          className="flex flex-col gap-5"
        >
          {request.error && <Alert tone="error">{request.error.message}</Alert>}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Button type="submit" size="lg" loading={request.isPending} disabled={!authAvailable}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link to={paths.login} className="text-sand underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}

function SetNewPassword() {
  const form = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) })
  const update = useMutation({ mutationFn: (password: string) => authService.updatePassword(password) })
  const e = form.formState.errors

  return (
    <AuthShell eyebrow="Account recovery" title="New password">
      {update.isSuccess ? (
        <Alert tone="success" title="Password updated">
          <Link to={paths.account} className="underline underline-offset-4">
            Go to your account
          </Link>
        </Alert>
      ) : (
        <form
          onSubmit={form.handleSubmit(({ password }) => update.mutate(password))}
          noValidate
          className="flex flex-col gap-5"
        >
          {update.error && <Alert tone="error">{update.error.message}</Alert>}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={e.password?.message}
            {...form.register('password')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={e.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
          <Button type="submit" size="lg" loading={update.isPending}>
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
