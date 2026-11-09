import { getSupabase } from '@/lib/supabase/client'
import type { InventoryMovementRow } from '@/types/database'
import type { InventoryMovement, StockAdjustmentInput } from '@/types/inventory'
import { fromPostgrestError, unwrap } from '../core/errors'

const mapMovement = (r: InventoryMovementRow): InventoryMovement => ({
  id: r.id,
  variantId: r.variant_id,
  delta: r.delta,
  reason: r.reason,
  note: r.note,
  orderId: r.order_id,
  createdBy: r.created_by,
  createdAt: r.created_at,
})

export interface InventoryService {
  /**
   * Applies a stock change atomically. Implemented as a Postgres RPC so the
   * variant quantity and the movement log can never drift apart.
   */
  adjustStock(input: StockAdjustmentInput): Promise<InventoryMovement>
  listMovements(variantId: string): Promise<InventoryMovement[]>
  // listItems(), getSummary() and shipment intake arrive in Phase 4.
}

export const inventoryService: InventoryService = {
  async adjustStock({ variantId, delta, reason, note }) {
    const row = unwrap<InventoryMovementRow>(
      await getSupabase().rpc('adjust_stock', {
        p_variant_id: variantId,
        p_delta: delta,
        p_reason: reason,
        p_note: note ?? null,
      }),
    )
    return mapMovement(row)
  },

  async listMovements(variantId) {
    const { data, error } = await getSupabase()
      .from('inventory_movements')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as InventoryMovementRow[]).map(mapMovement)
  },
}
