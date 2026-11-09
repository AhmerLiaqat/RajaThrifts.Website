import { getSupabase } from '@/lib/supabase/client'
import type { Profile, ProfileUpdate, UserRole } from '@/types/auth'
import type { ProfileRow } from '@/types/database'
import { fromPostgrestError, unwrap } from '../core/errors'

export const mapProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  role: r.role,
  email: r.email,
  fullName: r.full_name,
  phone: r.phone,
  line1: r.address_line1,
  line2: r.address_line2,
  city: r.city,
  province: r.province,
  postalCode: r.postal_code,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const blankToNull = (v: string | null | undefined) => (v == null || v.trim() === '' ? null : v.trim())

export const profileService = {
  async getById(id: string): Promise<Profile> {
    return mapProfile(
      unwrap<ProfileRow>(await getSupabase().from('profiles').select('*').eq('id', id).single()),
    )
  },

  /** Only contact fields are writable by the owner (column grants in SQL); role/email are not sent. */
  async updateOwn(id: string, patch: ProfileUpdate): Promise<Profile> {
    const row: Record<string, string | null> = {}
    if ('fullName' in patch) row.full_name = blankToNull(patch.fullName)
    if ('phone' in patch) row.phone = blankToNull(patch.phone)
    if ('line1' in patch) row.address_line1 = blankToNull(patch.line1)
    if ('line2' in patch) row.address_line2 = blankToNull(patch.line2)
    if ('city' in patch) row.city = blankToNull(patch.city)
    if ('province' in patch) row.province = blankToNull(patch.province)
    if ('postalCode' in patch) row.postal_code = blankToNull(patch.postalCode)
    return mapProfile(
      unwrap<ProfileRow>(await getSupabase().from('profiles').update(row).eq('id', id).select().single()),
    )
  },

  /** Staff: everyone they are allowed to see (RLS). */
  async list(search?: string): Promise<Profile[]> {
    let query = getSupabase()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    const term = search?.replace(/[,()%*\\]/g, ' ').trim()
    if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,phone.ilike.%${term}%`)
    const { data, error } = await query
    if (error) throw fromPostgrestError(error)
    return (data as ProfileRow[]).map(mapProfile)
  },

  /** Admin only (enforced inside public.set_user_role). */
  async setRole(userId: string, role: UserRole): Promise<Profile> {
    return mapProfile(
      unwrap<ProfileRow>(await getSupabase().rpc('set_user_role', { p_user_id: userId, p_role: role })),
    )
  },
}
