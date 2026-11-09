import { useSyncExternalStore } from 'react'
import type { Collection } from '@/constants/collections'
import type { MinorUnits } from '@/types/common'

/**
 * Client-side bag. Persisted to localStorage (per browser) and synced across tabs.
 * Stock is re-validated server-side at checkout (Phase 5). This store only caps
 * quantities at what the listing showed, which for thrift is usually 1.
 */
export interface CartItem {
  variantId: string
  productId: string
  slug: string
  name: string
  brand: string
  collection: Collection
  imageUrl: string | null
  sizeLabel: string
  sku: string
  unitPrice: MinorUnits
  quantity: number
  /** Stock available when added. */
  maxQuantity: number
}

export type AddResult = 'added' | 'already_max'

interface CartState {
  items: CartItem[]
  /** Drives the "Added to bag" toast. */
  lastAdded: { item: CartItem; at: number } | null
}

const STORAGE_KEY = 'rajathrifs.cart.v1'

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as CartItem[]) : []
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Private mode / storage full: the bag still works for this session.
  }
}

let state: CartState = { items: load(), lastAdded: null }
const listeners = new Set<() => void>()

function setState(next: CartState, save = true) {
  state = next
  if (save) persist(next.items)
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) setState({ ...state, items: load() }, false)
  })
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => state,

  add(item: Omit<CartItem, 'quantity'>, quantity = 1): AddResult {
    const existing = state.items.find((i) => i.variantId === item.variantId)
    if (existing && existing.quantity >= existing.maxQuantity) return 'already_max'

    const items = existing
      ? state.items.map((i) =>
          i.variantId === item.variantId
            ? { ...i, quantity: Math.min(i.quantity + quantity, i.maxQuantity) }
            : i,
        )
      : [...state.items, { ...item, quantity: Math.min(quantity, item.maxQuantity) }]

    const added = items.find((i) => i.variantId === item.variantId)!
    setState({ items, lastAdded: { item: added, at: Date.now() } })
    return 'added'
  },

  setQuantity(variantId: string, quantity: number) {
    setState({
      ...state,
      items: state.items
        .map((i) =>
          i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(quantity, i.maxQuantity)) } : i,
        )
        .filter((i) => i.quantity > 0),
    })
  },

  remove(variantId: string) {
    setState({ ...state, items: state.items.filter((i) => i.variantId !== variantId) })
  },

  clear() {
    setState({ items: [], lastAdded: null })
  },

  dismissToast() {
    setState({ ...state, lastAdded: null }, false)
  },
}

export function useCart() {
  const snapshot = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getSnapshot)
  const count = snapshot.items.reduce((n, i) => n + i.quantity, 0)
  const subtotal = snapshot.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0)
  return {
    ...snapshot,
    count,
    subtotal,
    has: (variantId: string) => snapshot.items.some((i) => i.variantId === variantId),
  }
}
