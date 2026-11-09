import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { queryKeys } from '@/lib/query/queryClient'
import { orderService, profileService } from '@/services'
import type { ProfileUpdate } from '@/types/auth'
import type { PlaceOrderInput } from '@/types/order'

export function useMyProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.profile(user?.id ?? ''),
    queryFn: () => profileService.getById(user!.id),
    enabled: !!user && user.id !== 'dev-admin',
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => profileService.updateOwn(user!.id, patch),
    onSuccess: (profile) => {
      qc.setQueryData(queryKeys.profile(profile.id), profile)
      qc.invalidateQueries({ queryKey: queryKeys.auth.user })
    },
  })
}

export function useMyOrders() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.orders.mine(user?.id ?? ''),
    queryFn: () => orderService.listForUser(user!.id),
    enabled: !!user && user.id !== 'dev-admin',
  })
}

export function useOrder(orderNumber: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderNumber ?? ''),
    queryFn: () => orderService.getByNumber(orderNumber!),
    enabled: !!orderNumber,
  })
}

export function usePlaceOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => orderService.place(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
      // Stock changed: refresh catalog views.
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      orderService.cancel(orderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
      qc.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}
