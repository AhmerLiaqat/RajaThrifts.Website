import type { ID, ISODateString } from './common'

/** Mirrors public.user_role. Order matters: each role includes the ones before it. */
export const USER_ROLES = ['customer', 'shopkeeper', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Roles that can open the back office. */
export const STAFF_ROLES: readonly UserRole[] = ['shopkeeper', 'admin']

export interface Address {
  line1: string | null
  line2: string | null
  city: string | null
  province: string | null
  postalCode: string | null
}

export interface Profile extends Address {
  id: ID
  role: UserRole
  email: string | null
  fullName: string | null
  phone: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

/** The signed-in user as the app sees it (role comes from public.profiles). */
export interface AppUser {
  id: ID
  email: string | null
  fullName: string | null
  role: UserRole
}

/** Fields a user may edit on their own profile (enforced by column grants in SQL). */
export type ProfileUpdate = Partial<Pick<Profile, 'fullName' | 'phone'> & Address>

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  phone?: string
}
