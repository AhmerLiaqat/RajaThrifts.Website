import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { financeService } from '@/services/finance/finance.service'
import {
  addMonths,
  daysBetween,
  endOfMonth,
  isIsoDate,
  startOfMonth,
  startOfYear,
  todayPKT,
} from '@/lib/utils/dates'
import type { Granularity } from '@/types/finance'

// ── Period (URL state: ?from=&to=&g=) ─────────────────────────────────────────
export type PresetKey =
  'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'last_12_months' | 'custom'

export const PRESETS: Array<{
  key: Exclude<PresetKey, 'custom'>
  label: string
  range: () => [string, string]
}> = [
  { key: 'this_month', label: 'This month', range: () => [startOfMonth(todayPKT()), todayPKT()] },
  {
    key: 'last_month',
    label: 'Last month',
    range: () => [addMonths(todayPKT(), -1), endOfMonth(addMonths(todayPKT(), -1))],
  },
  { key: 'last_3_months', label: 'Last 3 months', range: () => [addMonths(todayPKT(), -2), todayPKT()] },
  { key: 'this_year', label: 'This year', range: () => [startOfYear(todayPKT()), todayPKT()] },
  { key: 'last_12_months', label: 'Last 12 months', range: () => [addMonths(todayPKT(), -11), todayPKT()] },
]

/** Sensible default bucket size for a range length. */
export const defaultGranularity = (from: string, to: string): Granularity => {
  const days = daysBetween(from, to)
  return days <= 45 ? 'day' : days <= 200 ? 'week' : days <= 1100 ? 'month' : 'year'
}

export function usePeriod() {
  const [params, setParams] = useSearchParams()
  const [defFrom, defTo] = PRESETS[0].range()
  const from = isIsoDate(params.get('from')) ? params.get('from')! : defFrom
  const to = isIsoDate(params.get('to')) ? params.get('to')! : defTo
  const g = params.get('g') as Granularity | null
  const granularity: Granularity =
    g && ['day', 'week', 'month', 'year'].includes(g) ? g : defaultGranularity(from, to)
  // Daily buckets are capped server-side at 400 days.
  const safeGranularity: Granularity =
    granularity === 'day' && daysBetween(from, to) > 400 ? 'month' : granularity

  const preset: PresetKey =
    PRESETS.find((p) => {
      const [a, b] = p.range()
      return a === from && b === to
    })?.key ?? 'custom'

  const set = (patch: { from?: string; to?: string; g?: Granularity | null }) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  return {
    from,
    to,
    granularity: safeGranularity,
    preset,
    setRange: (a: string, b: string) => set({ from: a, to: b, g: null }),
    setGranularity: (gr: Granularity) => set({ g: gr }),
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────
const K = ['finance'] as const

export const useFinanceReport = (from: string, to: string, g: Granularity) =>
  useQuery({
    queryKey: [...K, 'report', from, to, g],
    queryFn: () => financeService.report(from, to, g),
    placeholderData: keepPreviousData,
  })

export const useInvestments = () =>
  useQuery({ queryKey: [...K, 'investments'], queryFn: financeService.investments })
export const useSuppliers = () =>
  useQuery({ queryKey: [...K, 'suppliers'], queryFn: financeService.suppliers })
export const usePurchases = () =>
  useQuery({ queryKey: [...K, 'purchases'], queryFn: financeService.purchases })
export const usePurchaseCosts = (id: string | null) =>
  useQuery({
    queryKey: [...K, 'purchase-costs', id],
    queryFn: () => financeService.purchaseCosts(id!),
    enabled: !!id,
  })
export const useLinkedProducts = (id: string | null) =>
  useQuery({
    queryKey: [...K, 'linked', id],
    queryFn: () => financeService.linkedProducts(id!),
    enabled: !!id,
  })
export const useExpenses = (from: string, to: string) =>
  useQuery({
    queryKey: [...K, 'expenses', from, to],
    queryFn: () => financeService.expenses(from, to),
    placeholderData: keepPreviousData,
  })
export const usePendingCod = () =>
  useQuery({ queryKey: [...K, 'pending-cod'], queryFn: financeService.pendingCod })
export const useSettlements = () =>
  useQuery({ queryKey: [...K, 'settlements'], queryFn: financeService.settlements })
export const useRefunds = (from: string, to: string) =>
  useQuery({
    queryKey: [...K, 'refunds', from, to],
    queryFn: () => financeService.refunds(from, to),
    placeholderData: keepPreviousData,
  })
export const useDeliveredSales = (from: string, to: string) =>
  useQuery({
    queryKey: [...K, 'sales', from, to],
    queryFn: () => financeService.deliveredSales(from, to),
    placeholderData: keepPreviousData,
  })

/** Any finance write invalidates every finance view (and orders/dashboard for settlements). */
export function useFinanceMutation<TVars, TResult = unknown>(fn: (v: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of [K, ['orders'], ['dashboard'], ['admin']]) qc.invalidateQueries({ queryKey: key })
    },
  })
}
