import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, ShieldCheck } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { paths } from '@/app/router/paths'
import { SupabaseNotice } from '@/components/feedback/SupabaseNotice'
import { Button, ButtonLink, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { env } from '@/config/env'
import { PAYMENT_METHOD_META } from '@/constants/order'
import { useMyProfile, usePlaceOrder, useUpdateProfile } from '@/features/account/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { phoneSchema, PROVINCES } from '@/features/auth/schemas'
import { cn } from '@/lib/utils/cn'
import { formatPrice, formatPriceCode } from '@/lib/utils/format'
import type { Profile } from '@/types/auth'
import type { PaymentMethod } from '@/types/order'
import { cartStore, useCart } from '../store/cart-store'

const METHODS = (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).filter(
  (m) => PAYMENT_METHOD_META[m].available,
) as Array<Exclude<PaymentMethod, 'card'>>

const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Enter the recipient’s name').max(120),
  phone: phoneSchema,
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
  line1: z.string().trim().min(3, 'Enter your street address').max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  province: z.string().trim().max(80),
  postalCode: z.string().trim().max(12),
  paymentMethod: z.enum(METHODS as [Exclude<PaymentMethod, 'card'>, ...Exclude<PaymentMethod, 'card'>[]]),
  notes: z.string().trim().max(500),
  saveAddress: z.boolean(),
})
type CheckoutValues = z.infer<typeof checkoutSchema>

function Summary() {
  const { items, subtotal } = useCart()
  return (
    <aside className="h-fit rounded-sm border border-bone/10 bg-carbon/60 p-6 lg:sticky lg:top-28">
      <p className="font-display text-xs tracking-[0.24em] uppercase">Order summary</p>
      <ul className="mt-5 divide-y divide-bone/10">
        {items.map((i) => (
          <li key={i.variantId} className="flex items-center gap-4 py-3">
            {i.imageUrl && <img src={i.imageUrl} alt="" className="size-14 rounded-sm object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-bone">
                {i.brand} {i.name}
              </p>
              <p className="text-xs text-ink-muted">
                {i.sizeLabel} · Qty {i.quantity}
              </p>
            </div>
            <p className="font-display text-sm tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-bone/10 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatPriceCode(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="text-ink-muted">Confirmed with your order</dd>
        </div>
      </dl>
      <p className="mt-4 flex items-start gap-2 text-xs text-ink-subtle">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-sand" /> Prices and stock are re-checked
        securely when you place the order.
      </p>
    </aside>
  )
}

function CheckoutForm({ profile, email }: { profile: Profile | undefined; email: string | null }) {
  const navigate = useNavigate()
  const { items } = useCart()
  const placeOrder = usePlaceOrder()
  const updateProfile = useUpdateProfile()

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: profile?.fullName ?? '',
      phone: profile?.phone ?? '',
      email: email ?? '',
      line1: profile?.line1 ?? '',
      line2: profile?.line2 ?? '',
      city: profile?.city ?? '',
      province: profile?.province ?? '',
      postalCode: profile?.postalCode ?? '',
      paymentMethod: 'cod',
      notes: '',
      saveAddress: !profile?.line1,
    },
  })
  const e = form.formState.errors
  const method = useWatch({ control: form.control, name: 'paymentMethod' })

  const onSubmit = form.handleSubmit((v) => {
    placeOrder.mutate(
      {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        contact: { name: v.name, phone: v.phone, email: v.email || undefined },
        address: {
          line1: v.line1,
          line2: v.line2,
          city: v.city,
          province: v.province,
          postalCode: v.postalCode,
        },
        paymentMethod: v.paymentMethod,
        notes: v.notes,
      },
      {
        onSuccess: (order) => {
          if (v.saveAddress && profile) {
            updateProfile.mutate({
              fullName: profile.fullName || v.name,
              phone: v.phone,
              line1: v.line1,
              line2: v.line2,
              city: v.city,
              province: v.province,
              postalCode: v.postalCode,
            })
          }
          cartStore.clear()
          navigate(paths.accountOrder(order.orderNumber), { replace: true, state: { justPlaced: true } })
        },
      },
    )
  })

  const err = placeOrder.error as (Error & { code?: string }) | null

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      {err && (
        <Alert
          tone="error"
          title={err.code === 'OUT_OF_STOCK' ? 'A pair just sold' : 'We couldn’t place your order'}
        >
          {err.message}
          {err.code === 'OUT_OF_STOCK' && (
            <>
              {' '}
              <Link to={paths.cart} className="underline underline-offset-4">
                Review your bag
              </Link>
            </>
          )}
        </Alert>
      )}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-display text-xs tracking-[0.24em] uppercase">Contact</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Full name" autoComplete="name" error={e.name?.message} {...form.register('name')} />
          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            placeholder="0300 1234567"
            error={e.phone?.message}
            {...form.register('phone')}
          />
        </div>
        <Input
          label="Email (for updates)"
          type="email"
          autoComplete="email"
          error={e.email?.message}
          {...form.register('email')}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-display text-xs tracking-[0.24em] uppercase">Delivery address</legend>
        <Input
          label="Address"
          autoComplete="address-line1"
          error={e.line1?.message}
          {...form.register('line1')}
        />
        <Input label="Apartment, area (optional)" autoComplete="address-line2" {...form.register('line2')} />
        <div className="grid gap-5 sm:grid-cols-3">
          <Input
            label="City"
            autoComplete="address-level2"
            error={e.city?.message}
            {...form.register('city')}
          />
          <Select label="Province" {...form.register('province')}>
            <option value="">Select…</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
          <Input label="Postal code" autoComplete="postal-code" {...form.register('postalCode')} />
        </div>
        <label className="flex items-center gap-3 text-sm text-bone/80">
          <input type="checkbox" className="size-4 accent-[#C7B99A]" {...form.register('saveAddress')} />
          Save as my default address
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-5 font-display text-xs tracking-[0.24em] uppercase">Payment</legend>
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
          {METHODS.map((m) => (
            <label
              key={m}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-sm border p-4 transition-colors',
                method === m ? 'border-sand bg-sand/5' : 'border-bone/15 hover:border-bone/40',
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  value={m}
                  className="accent-[#C7B99A]"
                  {...form.register('paymentMethod')}
                />
                <span className="text-sm text-bone">{PAYMENT_METHOD_META[m].label}</span>
              </span>
              <span className="pl-7 text-xs text-ink-muted">{PAYMENT_METHOD_META[m].description}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-subtle">Card payments are not available yet.</p>
      </fieldset>

      <Textarea
        label="Order notes (optional)"
        placeholder="Landmark, preferred delivery time…"
        {...form.register('notes')}
      />

      <Button
        type="submit"
        variant="accent"
        size="lg"
        loading={placeOrder.isPending}
        className="w-full sm:w-auto"
      >
        <Lock className="size-4" /> Place order
      </Button>
    </form>
  )
}

export default function CheckoutPage() {
  const { items } = useCart()
  const { user, isAuthenticated, isLoading } = useAuth()
  const profile = useMyProfile()

  const blocked = !env.isSupabaseConfigured
    ? 'supabase'
    : env.useDemoCatalog
      ? 'demo'
      : !isLoading && !isAuthenticated
        ? 'signin'
        : items.length === 0
          ? 'empty'
          : null

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-5 text-5xl font-semibold tracking-[-0.03em] uppercase sm:text-6xl">Almost yours</h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {blocked === 'supabase' && <SupabaseNotice feature="Checkout" />}
          {blocked === 'demo' && (
            <Alert tone="info" title="Checkout is off in demo mode">
              The bag contains demo listings. Set <code>VITE_USE_DEMO_CATALOG=false</code> to sell the real
              catalog.
            </Alert>
          )}
          {blocked === 'signin' && (
            <Alert tone="info" title="Sign in to check out">
              Orders are linked to your account so you can track them.{' '}
              <Link
                to={paths.login}
                state={{ from: { pathname: paths.checkout } }}
                className="text-bone underline underline-offset-4"
              >
                Sign in
              </Link>{' '}
              or{' '}
              <Link
                to={paths.register}
                state={{ from: { pathname: paths.checkout } }}
                className="text-bone underline underline-offset-4"
              >
                create an account
              </Link>
              . Your bag is saved.
            </Alert>
          )}
          {blocked === 'empty' && (
            <div className="rounded-sm border border-dashed border-bone/15 p-10 text-center">
              <p className="text-bone">Your bag is empty.</p>
              <ButtonLink to={paths.shop} className="mt-6">
                Shop all pairs
              </ButtonLink>
            </div>
          )}
          {!blocked && isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
          {!blocked && !isLoading && (profile.data || profile.isError || user?.id === 'dev-admin') && (
            <CheckoutForm profile={profile.data} email={user?.email ?? null} />
          )}
        </div>
        {items.length > 0 && <Summary />}
      </div>
    </div>
  )
}
