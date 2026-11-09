import { z } from 'zod'

/** Pakistani mobile/landline, with or without +92 / spaces / dashes. Mirrors the SQL check. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 -]{6,19}$/, 'Enter a valid phone number, e.g. 0300 1234567')

export const emailSchema = z.email('Enter a valid email address').trim().toLowerCase()

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your name').max(120),
    email: emailSchema,
    phone: z.union([z.literal(''), phoneSchema]),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(120),
  phone: z.union([z.literal(''), phoneSchema]),
  line1: z.string().trim().max(200),
  line2: z.string().trim().max(200),
  city: z.string().trim().max(80),
  province: z.string().trim().max(80),
  postalCode: z.string().trim().max(12),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ProfileValues = z.infer<typeof profileSchema>

export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
]
