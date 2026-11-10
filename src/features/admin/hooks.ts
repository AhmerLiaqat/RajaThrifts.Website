import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services'
import {
  customerService,
  dashboardService,
  inventoryAdminService,
  returnService,
} from '@/services/dashboard/dashboard.service'
import type { InventoryMovementReason } from '@/types/inventory'
import type { ReturnReason, ReturnStatus } from '@/types/dashboard'

/** Invalidate every view that depends on stock, orders or returns. */
function useInvalidateOps() {
  const qc = useQueryClient()
  return () => {
    for (const key of [['admin'], ['orders'], ['products'], ['returns'], ['dashboard']])
      qc.invalidateQueries({ queryKey: key })
  }
}

// ── Overview & settings ─────────────────────────────────────────────────────
export const useDashboardSummary = (days: number) =>
  useQuery({
    queryKey: ['dashboard', 'summary', days],
    queryFn: () => dashboardService.summary(days),
    placeholderData: keepPreviousData,
  })

export const useStoreSettings = () =>
  useQuery({ queryKey: ['dashboard', 'settings'], queryFn: dashboardService.settings })

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dashboardService.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['store'] })
    },
  })
}

// ── Inventory ───────────────────────────────────────────────────────────────
export const useInventory = () =>
  useQuery({ queryKey: ['admin', 'inventory'], queryFn: inventoryAdminService.list })

export const useMovements = (variantId: string | null) =>
  useQuery({
    queryKey: ['admin', 'movements', variantId],
    queryFn: () => inventoryService.listMovements(variantId!),
    enabled: !!variantId,
  })

export function useInventoryMutations() {
  const invalidate = useInvalidateOps()
  return {
    adjust: useMutation({
      mutationFn: (v: { variantId: string; delta: number; reason: InventoryMovementReason; note?: string }) =>
        inventoryService.adjustStock(v),
      onSuccess: invalidate,
    }),
    sku: useMutation({
      mutationFn: (v: { variantId: string; sku: string }) =>
        inventoryAdminService.updateSku(v.variantId, v.sku),
      onSuccess: invalidate,
    }),
  }
}

// ── Customers ───────────────────────────────────────────────────────────────
export const useCustomers = (search: string) =>
  useQuery({
    queryKey: ['admin', 'customers', search],
    queryFn: () => customerService.list(search),
    placeholderData: keepPreviousData,
  })

// ── Returns ─────────────────────────────────────────────────────────────────
export const useReturns = (status: ReturnStatus | 'open' | 'all') =>
  useQuery({ queryKey: ['returns', 'list', status], queryFn: () => returnService.list(status) })

export const useOrderReturns = (orderId: string | undefined) =>
  useQuery({
    queryKey: ['returns', 'order', orderId],
    queryFn: () => returnService.forOrder(orderId!),
    enabled: !!orderId,
  })

export function useReturnMutations() {
  const invalidate = useInvalidateOps()
  return {
    update: useMutation({
      mutationFn: (v: {
        id: string
        status: ReturnStatus
        restock?: boolean
        refundAmount?: number | null
        notes?: string
      }) => returnService.update(v.id, v.status, v),
      onSuccess: invalidate,
    }),
    request: useMutation({
      mutationFn: (v: { orderItemId: string; quantity: number; reason: ReturnReason; comment?: string }) =>
        returnService.request(v.orderItemId, v.quantity, v.reason, v.comment),
      onSuccess: invalidate,
    }),
  }
}
