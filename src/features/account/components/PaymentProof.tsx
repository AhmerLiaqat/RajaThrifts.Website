import { useQuery } from '@tanstack/react-query'
import { CircleCheck, Clock, ImagePlus, MessageCircle } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePublicSettings } from '@/features/store/usePublicSettings'
import { cn } from '@/lib/utils/cn'
import { formatPriceCode } from '@/lib/utils/format'
import { ALLOWED_PROOF_TYPES, paymentProofUrl } from '@/services/core/storage'
import { whatsappChatUrl } from '@/services/store/store.service'
import type { Order } from '@/types/order'
import { useReplacePaymentProof } from '../hooks'

/** Signed URL for a private payment screenshot (owner or staff). */
function usePaymentProofUrl(path: string | null) {
  return useQuery({
    queryKey: ['payment-proof', path],
    queryFn: () => paymentProofUrl(path!),
    enabled: !!path,
    staleTime: 50 * 60_000,
  })
}

/** Thumbnail that opens the full screenshot in a new tab. */
export function PaymentProofThumb({ path, className }: { path: string; className?: string }) {
  const url = usePaymentProofUrl(path)
  if (url.isError) return <p className="text-xs text-danger">Could not load the screenshot.</p>
  return (
    <a
      href={url.data}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'block overflow-hidden rounded-xl border border-bone/15 bg-night/40 transition-colors hover:border-sand',
        className,
      )}
    >
      {url.data ? (
        <img src={url.data} alt="Bank transfer screenshot" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-xs text-ink-subtle">Loading…</span>
      )}
    </a>
  )
}

/** The order details the WhatsApp message needs (works for a full Order or a fresh guest checkout). */
export interface WhatsAppOrder {
  orderNumber: string
  total: number
  contactName: string
  contactPhone: string
  city: string
  hasPaymentProof: boolean
  items: Array<{ brandName: string; productName: string; sizeLabel: string; quantity: number }>
}

/** Opens a WhatsApp chat with the shop, pre-filled with the order details. */
export function WhatsAppOrderButton({ order, className }: { order: WhatsAppOrder; className?: string }) {
  const settings = usePublicSettings()
  const number = settings.data?.whatsappNumber
  if (!number) return null
  const lines = [
    `Assalam o Alaikum! I just placed order ${order.orderNumber} on Raja Thrifts.`,
    ...order.items.map((i) => `• ${i.brandName} ${i.productName} (${i.sizeLabel}) × ${i.quantity}`),
    `Total: ${formatPriceCode(order.total)}`,
    `Name: ${order.contactName}`,
    `Phone: ${order.contactPhone}`,
    `City: ${order.city}`,
    order.hasPaymentProof ?'Payment screenshot uploaded with the order.' : '',
  ].filter(Boolean)
  return (
    <a
      href={whatsappChatUrl(number, lines.join('\n'))}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]',
        className,
      )}
    >
      <MessageCircle className="size-4" /> Send order on WhatsApp
    </a>
  )
}

/** Customer view of the advance payment: status, screenshot, and re-upload while pending. */
export function PaymentProofSection({ order }: { order: Order }) {
  const { user } = useAuth()
  const replace = useReplacePaymentProof()
  const inputRef = useRef<HTMLInputElement>(null)
  if (order.paymentMethod !== 'bank_transfer') return null

  const paid = order.paymentStatus === 'paid'
  const canReplace = order.status === 'pending' && order.paymentStatus === 'pending' && !!user

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="font-display text-xs tracking-wider uppercase">Advance payment</h2>
      <p className="mt-3 flex items-center gap-2 text-sm">
        {paid ? (
          <>
            <CircleCheck className="size-4 text-success" /> Payment verified. Thank you!
          </>
        ) : order.paymentProofPath ? (
          <>
            <Clock className="size-4 text-warning" /> Screenshot received. We are verifying your transfer.
          </>
        ) : (
          <>
            <Clock className="size-4 text-warning" /> Waiting for your transfer screenshot.
          </>
        )}
      </p>

      {order.paymentProofPath && (
        <PaymentProofThumb path={order.paymentProofPath} className="mt-4 h-40 w-32" />
      )}

      {replace.error && (
        <Alert tone="error" className="mt-4">
          {replace.error.message}
        </Alert>
      )}
      {canReplace && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            loading={replace.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" /> {order.paymentProofPath ? 'Replace screenshot' : 'Upload screenshot'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_PROOF_TYPES.join(',')}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file && user) replace.mutate({ userId: user.id, orderId: order.id, file })
            }}
          />
        </>
      )}
    </section>
  )
}
