import { getSupabase } from '@/lib/supabase/client'
import type { ProductWithRelationsRow, WishlistRow } from '@/types/database'
import type { ProductSummary } from '@/types/product'
import { check, fromPostgrestError } from '../core/errors'
import { mapProduct, PRODUCT_SELECT } from '../products/product.mappers'
import { toSummary } from '../products/product.query'

/** Server-side wishlist for signed-in users. RLS keeps every row private to its owner. */
export const wishlistService = {
  async listProductIds(): Promise<string[]> {
    const { data, error } = await getSupabase()
      .from('wishlists')
      .select('product_id')
      .order('created_at', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as Pick<WishlistRow, 'product_id'>[]).map((r) => r.product_id)
  },

  async listProducts(): Promise<ProductSummary[]> {
    const { data, error } = await getSupabase()
      .from('wishlists')
      .select(`created_at, product:products(${PRODUCT_SELECT})`)
      .order('created_at', { ascending: false })
    if (error) throw fromPostgrestError(error)
    return (data as unknown as Array<{ product: ProductWithRelationsRow | null }>)
      .filter((r) => r.product) // hidden by RLS (e.g. archived)
      .map((r) => toSummary(mapProduct(r.product!)))
  },

  async add(userId: string, productId: string): Promise<void> {
    const res = await getSupabase().from('wishlists').insert({ user_id: userId, product_id: productId })
    // Already saved (e.g. from another tab) is fine.
    if (res.error?.code === '23505') return
    check(res)
  },

  async remove(productId: string): Promise<void> {
    check(await getSupabase().from('wishlists').delete().eq('product_id', productId))
  },

  async addMany(userId: string, productIds: string[]): Promise<void> {
    if (!productIds.length) return
    check(
      await getSupabase()
        .from('wishlists')
        .upsert(
          productIds.map((product_id) => ({ user_id: userId, product_id })),
          { onConflict: 'user_id,product_id', ignoreDuplicates: true },
        ),
    )
  },
}
