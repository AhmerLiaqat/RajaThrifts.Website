import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Heart, LayoutDashboard, LogOut, Package } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { MaskedText } from '@/components/motion/MaskedText'
import { Button, ButtonLink, Input } from '@/components/ui'
import { Alert, Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth, useSignOut } from '@/features/auth/hooks/useAuth'
import { PROVINCES, profileSchema, type ProfileValues } from '@/features/auth/schemas'
import { useWishlist } from '@/features/wishlist/useWishlist'
import { formatDate, formatPrice } from '@/lib/utils/format'
import type { Profile } from '@/types/auth'
import { OrderStatusBadge } from '../components/OrderBits'
import { useMyOrders, useMyProfile, useUpdateProfile } from '../hooks'

const ROLE_LABEL = { customer: 'Customer', shopkeeper: 'Shopkeeper', admin: 'Admin' } as const

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      line1: profile.line1 ?? '',
      line2: profile.line2 ?? '',
      city: profile.city ?? '',
      province: profile.province ?? '',
      postalCode: profile.postalCode ?? '',
    },
  })
  const e = form.formState.errors

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) => update.mutate(v, { onSuccess: () => form.reset(v) }))}
      className="flex flex-col gap-5"
    >
      {update.error && <Alert tone="error">{update.error.message}</Alert>}
      {update.isSuccess && !form.formState.isDirty && <Alert tone="success">Profile saved.</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Full name"
          autoComplete="name"
          error={e.fullName?.message}
          {...form.register('fullName')}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          error={e.phone?.message}
          {...form.register('phone')}
        />
      </div>
      <Input
        label="Email"
        value={profile.email ?? ''}
        disabled
        hint="Contact us to change your email address."
        readOnly
      />
      <p className="mt-2 font-display text-[11px] tracking-[0.24em] text-ink-subtle uppercase">
        Default delivery address
      </p>
      <Input
        label="Address"
        autoComplete="address-line1"
        error={e.line1?.message}
        {...form.register('line1')}
      />
      <Input label="Apartment, area (optional)" autoComplete="address-line2" {...form.register('line2')} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="City" autoComplete="address-level2" {...form.register('city')} />
        <Select label="Province" {...form.register('province')}>
          <option value="">Select…</option>
          {PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
        <Input label="Postal code" autoComplete="postal-code" {...form.register('postalCode')} />
      </div>
      <div>
        <Button type="submit" loading={update.isPending} disabled={!form.formState.isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const signOut = useSignOut()
  const profile = useMyProfile()
  const orders = useMyOrders()
  const wishlist = useWishlist()

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <div className="flex flex-col gap-6 border-b border-bone/10 pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">
            {user ? ROLE_LABEL[user.role] : 'Account'} · {user?.email}
          </p>
          <h1 className="mt-5 text-[clamp(2.75rem,7vw,6rem)] leading-[0.9] font-semibold tracking-[-0.04em] uppercase">
            <MaskedText
              immediate
              lines={[{ text: user?.fullName ? `Hi, ${user.fullName.split(' ')[0]}` : 'Your account' }]}
            />
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {isStaff && (
            <ButtonLink to={paths.admin.root} variant="accent">
              <LayoutDashboard className="size-4" /> Back office
            </ButtonLink>
          )}
          <ButtonLink to={paths.wishlist} variant="outline">
            <Heart className="size-4" /> Wishlist ({wishlist.count})
          </ButtonLink>
          <Button
            variant="ghost"
            loading={signOut.isPending}
            onClick={() => signOut.mutate(undefined, { onSuccess: () => navigate(paths.home) })}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-16 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="font-display text-xs tracking-[0.24em] uppercase">
            Orders
          </h2>
          <div className="mt-6">
            {orders.isPending ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 bg-carbon" />
                ))}
              </div>
            ) : orders.error ? (
              <Alert tone="error">{orders.error.message}</Alert>
            ) : !orders.data?.length ? (
              <div className="rounded-sm border border-dashed border-bone/15 p-10 text-center">
                <Package className="mx-auto size-7 text-sand" aria-hidden />
                <p className="mt-4 text-bone">No orders yet</p>
                <Link
                  to={paths.shop}
                  className="mt-2 inline-block text-sm text-sand underline-offset-4 hover:underline"
                >
                  Find your next pair
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-bone/10 border-y border-bone/10">
                {orders.data.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={paths.accountOrder(o.orderNumber)}
                      className="group flex items-center gap-4 py-5"
                    >
                      <div className="flex -space-x-3">
                        {o.items
                          .slice(0, 3)
                          .map((i) =>
                            i.imageUrl ? (
                              <img
                                key={i.id}
                                src={i.imageUrl}
                                alt=""
                                className="size-12 rounded-sm border-2 border-night object-cover"
                              />
                            ) : null,
                          )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-bone">{o.orderNumber}</p>
                        <p className="text-xs text-ink-muted">
                          {formatDate(o.placedAt)} · {o.items.length}{' '}
                          {o.items.length === 1 ? 'pair' : 'pairs'}
                        </p>
                      </div>
                      <OrderStatusBadge status={o.status} />
                      <p className="hidden w-24 text-right font-display text-sm tabular-nums sm:block">
                        {formatPrice(o.total)}
                      </p>
                      <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-sand" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="font-display text-xs tracking-[0.24em] uppercase">
            Profile
          </h2>
          <div className="mt-6">
            {profile.data ? (
              <ProfileForm key={profile.data.updatedAt} profile={profile.data} />
            ) : profile.error ? (
              <Alert tone="error">{profile.error.message}</Alert>
            ) : user?.id === 'dev-admin' ? (
              <Alert tone="info">Dev admin bypass has no profile. Sign in with a real account.</Alert>
            ) : (
              <Skeleton className="h-80 bg-carbon" />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
