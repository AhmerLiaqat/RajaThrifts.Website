import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { RETURN_REASON_LABEL, RETURN_STATUS_META } from '@/constants/returns'
import { useOrderReturns, useReturnMutations, useStoreSettings } from '@/features/admin/hooks'
import { ReturnStatusPill } from '@/features/admin/returns/ReturnStatusPill'
import { formatDate } from '@/lib/utils/format'
import type { ReturnReason } from '@/types/dashboard'
import type { Order } from '@/types/order'

/**
 * Customer return requests for a delivered order. The window and quantity limits
 * are enforced by public.request_return(); this UI mirrors them for clarity.
 */
export function ReturnRequestSection({ order }: { order: Order }) {
  const settings = useStoreSettings()
  const returns = useOrderReturns(order.id)
  const { request } = useReturnMutations()
  const [open, setOpen] = useState(false)
  const [itemId, setItemId] = useState(order.items[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState<ReturnReason>('wrong_size')
  const [comment, setComment] = useState('')
  // Captured once per mount: render must stay pure.
  const [now] = useState(() => Date.now())

  const windowDays = settings.data?.returnWindowDays ?? 0
  const deadline = order.deliveredAt
    ? new Date(Date.parse(order.deliveredAt) + windowDays * 86_400_000)
    : null
  const windowOpen = !!deadline && windowDays > 0 && deadline.getTime() > now

  const returnedFor = (id: string) =>
    (returns.data ?? [])
      .filter((r) => r.orderItemId === id && r.status !== 'rejected')
      .reduce((n, r) => n + r.quantity, 0)
  const item = order.items.find((i) => i.id === itemId)
  const remaining = item ? item.quantity - returnedFor(item.id) : 0

  if (order.status !== 'delivered' && !returns.data?.length) return null

  return (
    <section className="border-t border-bone/10 pt-6">
      <h2 className="mb-3 font-display text-xs tracking-[0.24em] uppercase">Returns</h2>

      {!!returns.data?.length && (
        <ul className="mb-4 space-y-2">
          {returns.data.map((r) => (
            <li key={r.id} className="rounded-sm border border-bone/10 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono">{r.returnNumber}</span>
                <ReturnStatusPill status={r.status} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {r.item?.productName} ×{r.quantity} · {RETURN_REASON_LABEL[r.reason]} ·{' '}
                {formatDate(r.requestedAt)}
              </p>
              <p className="mt-1 text-xs text-ink-subtle">{RETURN_STATUS_META[r.status].description}</p>
            </li>
          ))}
        </ul>
      )}

      {order.status === 'delivered' &&
        (windowOpen ? (
          open ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                request.mutate(
                  { orderItemId: itemId, quantity, reason, comment: comment.trim() || undefined },
                  {
                    onSuccess: () => {
                      setOpen(false)
                      setComment('')
                    },
                  },
                )
              }}
              className="flex flex-col gap-4"
            >
              {request.error && <Alert tone="error">{request.error.message}</Alert>}
              <Select
                label="Item"
                value={itemId}
                onChange={(e) => {
                  setItemId(e.target.value)
                  setQuantity(1)
                }}
              >
                {order.items.map((i) => (
                  <option key={i.id} value={i.id} disabled={i.quantity - returnedFor(i.id) <= 0}>
                    {i.productName} · {i.sizeLabel}
                  </option>
                ))}
              </Select>
              {remaining > 1 && (
                <Select
                  label="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                >
                  {Array.from({ length: remaining }, (_, n) => (
                    <option key={n + 1}>{n + 1}</option>
                  ))}
                </Select>
              )}
              <Select
                label="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
              >
                {(Object.keys(RETURN_REASON_LABEL) as ReturnReason[]).map((r) => (
                  <option key={r} value={r}>
                    {RETURN_REASON_LABEL[r]}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Details (optional)"
                rows={3}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what’s wrong. Photos can be shared when we contact you."
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={request.isPending} disabled={remaining <= 0}>
                  Submit request
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div>
              {request.isSuccess && (
                <Alert tone="success" className="mb-3">
                  Return requested. We’ll be in touch.
                </Alert>
              )}
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                <RotateCcw className="size-3.5" /> Request a return
              </Button>
              <p className="mt-2 text-xs text-ink-subtle">
                Available until {deadline && formatDate(deadline.toISOString())}.
              </p>
            </div>
          )
        ) : (
          <p className="text-xs text-ink-subtle">
            {windowDays === 0
              ? 'Please contact us about returns.'
              : 'The return window for this order has closed. Please contact us.'}
          </p>
        ))}
    </section>
  )
}
