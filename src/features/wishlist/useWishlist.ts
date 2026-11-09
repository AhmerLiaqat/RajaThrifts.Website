import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { env } from '@/config/env'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { queryKeys } from '@/lib/query/queryClient'
import { catalogService, wishlistService } from '@/services'
import type { ProductSummary } from '@/types/product'

/**
 * Wishlist with two backends:
 *  - Signed in + live catalog → public.wishlists (persisted, private by RLS).
 *  - Guest or demo catalog    → localStorage on this device.
 * Guest saves are merged into the account on sign-in (see <WishlistSync />).
 */

const KEY = 'rajathrifs.wishlist.v1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Local store ─────────────────────────────────────────────────────────────
const read = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
let localIds = read()
const listeners = new Set<() => void>()
const setLocal = (ids: string[]) => {
  localIds = ids
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l())
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      localIds = read()
      listeners.forEach((l) => l())
    }
  })
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function useLocalIds() {
  return useSyncExternalStore(
    subscribe,
    () => localIds,
    () => localIds,
  )
}

// ── Public hook ─────────────────────────────────────────────────────────────
export function useWishlist() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const remote = !!user && env.isSupabaseConfigured && !env.useDemoCatalog && user.id !== 'dev-admin'
  const local = useLocalIds()

  const remoteIds = useQuery({
    queryKey: queryKeys.wishlist.ids(user?.id ?? ''),
    queryFn: () => wishlistService.listProductIds(),
    enabled: remote,
  })

  const toggle = useMutation({
    mutationFn: async ({ productId, saved }: { productId: string; saved: boolean }) => {
      if (saved) await wishlistService.remove(productId)
      else await wishlistService.add(user!.id, productId)
    },
    onMutate: async ({ productId, saved }) => {
      const key = queryKeys.wishlist.ids(user!.id)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<string[]>(key)
      qc.setQueryData<string[]>(key, (ids = []) =>
        saved ? ids.filter((i) => i !== productId) : [productId, ...ids],
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.wishlist.ids(user!.id), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.wishlist.all }),
  })

  const ids = remote ? (remoteIds.data ?? []) : local
  const set = new Set(ids)

  return {
    ids,
    count: ids.length,
    isRemote: remote,
    has: (productId: string) => set.has(productId),
    toggle: (productId: string) => {
      const saved = set.has(productId)
      if (remote) return toggle.mutate({ productId, saved })
      setLocal(saved ? local.filter((i) => i !== productId) : [productId, ...local])
    },
  }
}

/** Products for the wishlist page, in saved order. */
export function useWishlistProducts() {
  const { user } = useAuth()
  const { ids, isRemote } = useWishlist()

  return useQuery({
    queryKey: isRemote ? queryKeys.wishlist.products(user!.id) : ['wishlist', 'local', ids],
    queryFn: async (): Promise<ProductSummary[]> => {
      if (isRemote) return wishlistService.listProducts()
      if (!ids.length) return []
      const all = await catalogService.list({ availability: 'all', pageSize: 1000 })
      const byId = new Map(all.items.map((p) => [p.id, p]))
      return ids.map((id) => byId.get(id)).filter((p): p is ProductSummary => !!p)
    },
  })
}

/** Mount once: moves guest wishlist items into the account after sign-in. */
export function WishlistSync() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const synced = useRef<string | null>(null)

  useEffect(() => {
    const canSync = !!user && env.isSupabaseConfigured && !env.useDemoCatalog && user.id !== 'dev-admin'
    if (!canSync || synced.current === user.id) return
    synced.current = user.id
    const pending = localIds.filter((id) => UUID.test(id))
    if (!pending.length) return
    wishlistService
      .addMany(user.id, pending)
      .then(() => {
        setLocal(localIds.filter((id) => !pending.includes(id)))
        qc.invalidateQueries({ queryKey: queryKeys.wishlist.all })
      })
      .catch(() => {
        synced.current = null // retry next time
      })
  }, [user, qc])

  return null
}
