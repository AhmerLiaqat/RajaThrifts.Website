import type { ReturnReason, ReturnStatus } from '@/types/dashboard'

export const RETURN_STATUS_META: Record<
  ReturnStatus,
  { label: string; className: string; description: string }
> = {
  requested: {
    label: 'Requested',
    className: 'border-warning/25 bg-warning/10 text-warning',
    description: 'Waiting for a decision.',
  },
  approved: {
    label: 'Approved',
    className: 'border-info/25 bg-info/10 text-info',
    description: 'Approved. Waiting for the pair to arrive back.',
  },
  rejected: {
    label: 'Rejected',
    className: 'border-line bg-surface-sunken text-ink-muted',
    description: 'This return was declined.',
  },
  received: {
    label: 'Received',
    className: 'border-sand/25 bg-sand/10 text-sand',
    description: 'Pair received and checked.',
  },
  refunded: { label: 'Refunded', className: 'border-success/25 bg-success/10 text-success', description: 'Refund issued.' },
}

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  wrong_size: 'Wrong size / fit',
  not_as_described: 'Not as described',
  defect_not_disclosed: 'Defect not disclosed',
  damaged_in_transit: 'Damaged in transit',
  changed_mind: 'Changed mind',
  other: 'Other',
}

/** Mirrors public.update_return(): staff moves; 'refunded' is admin only. */
export const NEXT_RETURN_STATUSES: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded'],
  rejected: [],
  refunded: [],
}
