import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, ImageIcon, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { env } from '@/config/env'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { formatPriceCode } from '@/lib/utils/format'
import { orderService } from '@/services'
import type { Order } from '@/types/order'

const POLL_MS = 20_000
const ASKED_KEY = 'rt-order-alerts-asked'

/** Two-note chime with Web Audio (no asset to load). Browsers allow it after any click on the page. */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.connect(gain).connect(ctx.destination)
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      osc.start(t)
      osc.stop(t + 0.55)
    })
    window.setTimeout(() => void ctx.close(), 1500)
  } catch {
    // Audio unavailable: the on-screen alert still shows.
  }
}

/**
 * Staff dashboard: watches for new orders while any dashboard page is open and
 * announces them (toast, chime, tab title, desktop notification if allowed).
 */
export function NewOrderAlerts() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [alerts, setAlerts] = useState<Order[]>([])
  const [askVisible, setAskVisible] = useState(() => {
    try {
      return typeof Notification !== 'undefined' && Notification.permission === 'default' && !localStorage.getItem(ASKED_KEY)
    } catch {
      return false
    }
  })
  const since = useRef<string | null>(null)
  const active = env.isSupabaseConfigured && !!user

  const announce = useCallback(
    (orders: Order[]) => {
      setAlerts((a) => [...orders.reverse(), ...a].slice(0, 5))
      chime()
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        for (const o of orders) {
          new Notification(`New order ${o.orderNumber}`, {
            body: `${o.contactName} · ${formatPriceCode(o.total)}${o.paymentProofPath ? ' · screenshot attached' : ''}`,
            tag: o.id,
          })
        }
      }
    },
    [qc],
  )

  useEffect(() => {
    if (!active) return
    let stopped = false
    let timer: number | undefined

    const tick = async () => {
      try {
        if (since.current === null) {
          // Baseline on the server clock: the newest existing order.
          const { data } = await getSupabase()
            .from('orders')
            .select('placed_at')
            .order('placed_at', { ascending: false })
            .limit(1)
          since.current = (data?.[0]?.placed_at as string | undefined) ?? new Date(0).toISOString()
        } else {
          const fresh = await orderService.listSince(since.current)
          if (fresh.length && !stopped) {
            since.current = fresh.reduce((m, o) => (o.placedAt > m ? o.placedAt : m), since.current)
            announce(fresh)
          }
        }
      } catch {
        // Offline or signed out: try again next tick.
      }
      if (!stopped) timer = window.setTimeout(tick, POLL_MS)
    }
    void tick()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [active, announce])

  // Unread count in the tab title so a background tab still shows new orders.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '')
    document.title = alerts.length ? `(${alerts.length}) ${base}` : base
  }, [alerts.length])

  if (!active) return null

  const dismiss = (id: string) => setAlerts((a) => a.filter((o) => o.id !== id))

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
      {askVisible && (
        <div className="pointer-events-auto glass flex items-center gap-3 rounded-2xl p-4 shadow-pop">
          <BellRing className="size-5 shrink-0 text-sand" />
          <p className="flex-1 text-sm">Get a desktop alert when a new order comes in?</p>
          <button
            type="button"
            className="rounded-lg bg-sand px-3 py-1.5 text-xs font-semibold text-white hover:bg-sand-600"
            onClick={() => {
              void Notification.requestPermission()
              try {
                localStorage.setItem(ASKED_KEY, '1')
              } catch {
                /* ignore */
              }
              setAskVisible(false)
            }}
          >
            Turn on
          </button>
          <button
            type="button"
            aria-label="Not now"
            className="text-ink-subtle hover:text-bone"
            onClick={() => {
              try {
                localStorage.setItem(ASKED_KEY, '1')
              } catch {
                /* ignore */
              }
              setAskVisible(false)
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {alerts.map((o) => (
          <motion.div
            key={o.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            role="status"
            className="pointer-events-auto rounded-xl border border-line bg-surface-raised p-4 shadow-pop"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand-100 text-sand">
                <BellRing className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">New order {o.orderNumber}</p>
                <p className="mt-0.5 truncate text-sm text-ink-muted">
                  {o.contactName} · {o.shippingAddress.city} · {formatPriceCode(o.total)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
                  <ImageIcon className="size-3.5" />
                  {o.paymentProofPath ? 'Payment screenshot attached' : 'No payment screenshot'}
                </p>
                <Link
                  to={paths.admin.orders}
                  onClick={() => dismiss(o.id)}
                  className="mt-3 inline-block text-xs font-semibold text-sand underline-offset-4 hover:underline"
                >
                  Open orders →
                </Link>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(o.id)}
                className="text-ink-subtle hover:text-bone"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
