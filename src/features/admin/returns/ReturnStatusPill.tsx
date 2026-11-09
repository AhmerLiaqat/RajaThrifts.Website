import { Pill } from '@/components/admin/AdminUI'
import { RETURN_STATUS_META } from '@/constants/returns'
import type { ReturnStatus } from '@/types/dashboard'

export function ReturnStatusPill({ status }: { status: ReturnStatus }) {
  return <Pill className={RETURN_STATUS_META[status].className}>{RETURN_STATUS_META[status].label}</Pill>
}
