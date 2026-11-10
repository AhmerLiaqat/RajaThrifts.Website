import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, ImagePlus, Landmark, Lock, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { paths } from '@/app/router/paths'
import { SupabaseNotice } from '@/components/feedback/SupabaseNotice'
import { Button, ButtonLink, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { env } from '@/config/env'
import { useMyProfile, usePlaceAdvanceOrder, useUpdateProfile } from '@/features/account/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { phoneSchema, PROVINCES } from '@/features/auth/schemas'
import { usePublicSettings } from '@/features/store/usePublicSettings'
import { cn } from '@/lib/utils/cn'
import { formatPrice, formatPriceCode } from '@/lib/utils/format'
import { ALLOWED_PROOF_TYPES, MAX_IMAGE_BYTES } from '@/services/core/storage'
import type { Profile } from '@/types/auth'
import type { PublicStoreSettings } from '@/types/dashboard'
import type { OrderConfirmedState } from '@/features/orders/pages/OrderConfirmedPage'
import { cartStore, useCart } from '../store/cart-store'

/** Guests' contact details, remembered on this device only (opt-in checkbox). */
type Remembered = { name: string; phone: string; line1: string; line2: string; city: string; province: string }
const REMEMBER_KEY = 'rajathrifs.checkout-details.v1'
function loadRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    return raw ? (JSON.parse(raw) as Remembered) : null
  } catch {
    return null
  }
}
function rememberDetails(details: Remembered | null) {
  try {
    if (details) localStorage.setItem(REMEMBER_KEY, JSON.stringify(details))
    else localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // Storage blocked: nothing to remember.
  }
}

const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Enter the recipient’s full name').max(120),
  phone: phoneSchema,
  line1: z.string().trim().min(10, 'Enter the full address: house, street, area').max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  province: z.string().trim().min(1, 'Select your province').max(80),
  notes: z.string().trim().max(500),
  saveAddress: z.boolean(),
})
type CheckoutValues = z.infer<typeof checkoutSchema>

/** Mirrors private.shipping_fee_for() so the amount to transfer matches the order total. */
function deliveryFor(subtotal: number, s: PublicStoreSettings | undefined) {
  if (!s) return 0
  if (s.freeDeliveryThreshold !== null && subtotal >= s.freeDeliveryThreshold) return 0
  return s.deliveryCharge
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value.replace(/\s+/g, '')).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bone/15 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-sand hover:text-sand"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function BankDetails({ settings, amount }: { settings: PublicStoreSettings; amount: number }) {
  const rows = [
    ['Bank', settings.bankName],
    ['Account title', settings.bankAccountTitle],
    ['Account number', settings.bankAccountNumber],
    ['IBAN', settings.bankIban],
  ].filter((r): r is [string, string] => !!r[1])

  return (
    <div className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand text-night">
          <Landmark className="size-5" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">Pay in advance by bank transfer</p>
          <p className="mt-1 text-sm text-ink-muted">
            Transfer <strong className="text-sand">{formatPriceCode(amount)}</strong> to the account below,
            then upload a screenshot of the transfer.
          </p>
        </div>
      </div>
      <dl className="mt-5 divide-y divide-bone/10 rounded-xl border border-bone/10 bg-night/30">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <dt className="text-xs tracking-wide text-ink-subtle uppercase">{label}</dt>
              <dd className="mt-0.5 font-mono text-sm break-all text-bone">{value}</dd>
            </div>
            {label !== 'Bank' && <CopyButton value={value} />}
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <dt className="text-xs tracking-wide text-ink-subtle uppercase">Amount</dt>
            <dd className="mt-0.5 font-mono text-sm text-sand">{formatPriceCode(amount)}</dd>
          </div>
          <CopyButton value={String(Math.round(amount / 100))} />
        </div>
      </dl>
      {settings.paymentInstructions && (
        <p className="mt-4 text-sm whitespace-pre-line text-ink-muted">{settings.paymentInstructions}</p>
      )}
    </div>
  )
}

function ProofPicker({
  file,
  onChange,
  error,
}: {
  file: File | null
  onChange: (f: File | null) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-wide text-bone/80">Payment screenshot</p>
      {file && preview ? (
        <div className="flex items-center gap-4 rounded-2xl border border-sand/40 bg-sand/5 p-3">
          <img src={preview} alt="Payment screenshot preview" className="h-24 w-20 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-bone">{file.name}</p>
            <p className="text-xs text-ink-muted">{(file.size / 1024 / 1024).toFixed(1)} MB · ready to send</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove screenshot"
            className="grid size-9 place-items-center rounded-full text-ink-muted hover:bg-bone/10 hover:text-bone"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors',
            error ? 'border-danger/60' : 'border-bone/20 hover:border-sand/60 hover:bg-sand/5',
          )}
        >
          <ImagePlus className="size-7 text-sand" />
          <span className="text-sm text-bone">Upload the transfer screenshot</span>
          <span className="text-xs text-ink-subtle">JPG, PNG or HEIC · up to 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_PROOF_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}

function Summary({ delivery }: { delivery: number | null }) {
  const { items, subtotal } = useCart()
  return (
    <aside className="glass h-fit rounded-2xl p-6 lg:sticky lg:top-28">
      <p className="font-display text-xs tracking-wider uppercase">Order summary</p>
      <ul className="mt-5 divide-y divide-bone/10">
        {items.map((i) => (
          <li key={i.variantId} className="flex items-center gap-4 py-3">
            {i.imageUrl && <img src={i.imageUrl} alt="" className="size-14 rounded-lg object-cover" />}
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
          <dd className="tabular-nums">
            {delivery === null ? '…' : delivery === 0 ? 'Free' : formatPriceCode(delivery)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-bone/10 pt-3 font-display text-base">
          <dt>Total to transfer</dt>
          <dd className="text-sand tabular-nums">{formatPriceCode(subtotal + (delivery ?? 0))}</dd>
        </div>
      </dl>
      <p className="mt-4 flex items-start gap-2 text-xs text-ink-subtle">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-sand" /> Prices and stock are re-checked securely
        when you place the order. We confirm once your payment is verified.
      </p>
    </aside>
  )
}

function CheckoutForm({
  profile,
  userId,
  settings,
}: {
  profile: Profile | undefined
  /** null for guest checkout. */
  userId: string | null
  settings: PublicStoreSettings
}) {
  const navigate = useNavigate()
  const { items, subtotal } = useCart()
  const placeOrder = usePlaceAdvanceOrder()
  const updateProfile = useUpdateProfile()
  const [proof, setProof] = useState<File | null>(null)
  const [proofError, setProofError] = useState<string>()
  // A screenshot already uploaded for this file by a failed attempt, so a retry does not upload it twice.
  const [uploaded, setUploaded] = useState<{ file: File; path: string } | null>(null)
  const amount = subtotal + deliveryFor(subtotal, settings)
  const [remembered] = useState(loadRemembered)

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: profile?.fullName || remembered?.name || '',
      phone: profile?.phone || remembered?.phone || '',
      line1: profile?.line1 || remembered?.line1 || '',
      line2: profile?.line2 || remembered?.line2 || '',
      city: profile?.city || remembered?.city || '',
      province: profile?.province || remembered?.province || '',
      notes: '',
      saveAddress: true,
    },
  })
  const e = form.formState.errors

  const pickProof = (f: File | null) => {
    setProofError(undefined)
    if (f && !(ALLOWED_PROOF_TYPES as readonly string[]).includes(f.type))
      return setProofError('Please choose an image (JPG, PNG or HEIC).')
    if (f && f.size > MAX_IMAGE_BYTES) return setProofError('That image is larger than 5 MB.')
    setProof(f)
  }

  const onSubmit = form.handleSubmit(
    (v) => {
      if (!proof) return setProofError('Upload the screenshot of your bank transfer to continue.')
      placeOrder.mutate(
        {
          userId,
          file: proof,
          uploadedPath: uploaded?.file === proof ? uploaded.path : undefined,
          input: {
            items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
            contact: { name: v.name, phone: v.phone },
            address: { line1: v.line1, line2: v.line2, city: v.city, province: v.province },
            notes: v.notes,
          },
        },
        {
          onSuccess: ({ order }) => {
            rememberDetails(
              v.saveAddress
                ? { name: v.name, phone: v.phone, line1: v.line1, line2: v.line2, city: v.city, province: v.province }
                : null,
            )
            if (v.saveAddress && profile) {
              updateProfile.mutate({
                fullName: profile.fullName || v.name,
                phone: v.phone,
                line1: v.line1,
                line2: v.line2,
                city: v.city,
                province: v.province,
                postalCode: profile.postalCode ?? '',
              })
            }
            const confirmed: OrderConfirmedState = {
              order: {
                orderNumber: order.orderNumber,
                total: order.total,
                subtotal: order.subtotal,
                shippingFee: order.shippingFee,
                contactName: order.contactName,
                contactPhone: order.contactPhone,
                city: order.shippingAddress.city,
                hasPaymentProof: true,
                items: items.map((i) => ({
                  brandName: i.brand,
                  productName: i.name,
                  sizeLabel: i.sizeLabel,
                  quantity: i.quantity,
                  imageUrl: i.imageUrl,
                  lineTotal: i.unitPrice * i.quantity,
                })),
              },
            }
            cartStore.clear()
            navigate(paths.orderConfirmed(order.orderNumber), { replace: true, state: confirmed })
          },
          onError: (err) => {
            const path = (err as { paymentProofPath?: string }).paymentProofPath
            if (path) setUploaded({ file: proof, path })
          },
        },
      )
    },
    () => {
      if (!proof) setProofError('Upload the screenshot of your bank transfer to continue.')
    },
  )

  const err = placeOrder.error as (Error & { code?: string }) | null

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      {err && (
        <Alert tone="error" title={err.code === 'OUT_OF_STOCK' ? 'A pair just sold' : 'We couldn’t place your order'}>
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
        <legend className="mb-5 font-display text-xs tracking-wider uppercase">1 · Your details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Full name" autoComplete="name" error={e.name?.message} {...form.register('name')} />
          <Input
            label="Phone (WhatsApp)"
            type="tel"
            autoComplete="tel"
            placeholder="0300 1234567"
            error={e.phone?.message}
            {...form.register('phone')}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-display text-xs tracking-wider uppercase">2 · Delivery address</legend>
        <Input
          label="Full address"
          placeholder="House 12, Street 4, Block B, Gulberg III"
          autoComplete="address-line1"
          error={e.line1?.message}
          {...form.register('line1')}
        />
        <Input
          label="Nearest landmark (optional)"
          placeholder="Near Liberty Market"
          autoComplete="address-line2"
          {...form.register('line2')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="City" autoComplete="address-level2" error={e.city?.message} {...form.register('city')} />
          <Select label="Province" error={e.province?.message} {...form.register('province')}>
            <option value="">Select…</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Note for us (optional)"
          placeholder="Preferred delivery time, size questions, anything else…"
          {...form.register('notes')}
        />
        <label className="flex items-center gap-3 text-sm text-bone/80">
          <input type="checkbox" className="size-4 accent-sand" {...form.register('saveAddress')} />
          Remember my details on this device
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-5 font-display text-xs tracking-wider uppercase">3 · Payment</legend>
        <BankDetails settings={settings} amount={amount} />
        <ProofPicker file={proof} onChange={pickProof} error={proofError} />
      </fieldset>

      <Button type="submit" variant="accent" size="lg" loading={placeOrder.isPending} className="w-full sm:w-auto">
        <Lock className="size-4" /> {placeOrder.isPending ? 'Sending…' : 'Place order'}
      </Button>
    </form>
  )
}

export default function CheckoutPage() {
  const { items, subtotal } = useCart()
  const { user, isLoading } = useAuth()
  // Guests check out without an account; the dev bypass user also checks out as a guest.
  const userId = user && user.id !== 'dev-admin' ? user.id : null
  const profile = useMyProfile()
  const settings = usePublicSettings()
  const bankReady = !!settings.data?.bankAccountNumber || !!settings.data?.bankIban

  const blocked = !env.isSupabaseConfigured
    ? 'supabase'
    : env.useDemoCatalog
      ? 'demo'
      : items.length === 0
          ? 'empty'
        : settings.isSuccess && !bankReady
          ? 'nobank'
          : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-5 text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">
        Almost <span className="text-sand">yours</span>
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {blocked === 'supabase' && <SupabaseNotice feature="Checkout" />}
          {blocked === 'demo' && (
            <Alert tone="info" title="Checkout is off in demo mode">
              The bag contains demo listings. Set <code>VITE_USE_DEMO_CATALOG=false</code> to sell the real
              catalog.
            </Alert>
          )}
          {blocked === 'empty' && (
            <div className="rounded-2xl border border-dashed border-bone/15 p-10 text-center">
              <p className="text-bone">Your bag is empty.</p>
              <ButtonLink to={paths.shop} className="mt-6">
                Shop all pairs
              </ButtonLink>
            </div>
          )}
          {blocked === 'nobank' && (
            <Alert tone="info" title="Checkout opens soon">
              We are setting up payments. Please message us on WhatsApp to order this pair.
            </Alert>
          )}
          {settings.isError && <Alert tone="error">{settings.error.message}</Alert>}
          {!blocked && (isLoading || settings.isPending) && <p className="text-sm text-ink-muted">Loading…</p>}
          {!blocked &&
            !isLoading &&
            settings.data &&
            (!userId || profile.data || profile.isError) && (
              <CheckoutForm profile={profile.data} userId={userId} settings={settings.data} />
            )}
        </div>
        {items.length > 0 && <Summary delivery={settings.data ? deliveryFor(subtotal, settings.data) : null} />}
      </div>
    </div>
  )
}
