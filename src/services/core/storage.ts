import { env } from '@/config/env'
import { getSupabase } from '@/lib/supabase/client'
import { ServiceError } from './errors'

/** Resolves a storage path in the product images bucket to a public URL. */
export function productImageUrl(storagePath: string): string {
  return getSupabase().storage.from(env.productImagesBucket).getPublicUrl(storagePath).data.publicUrl
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/**
 * Uploads a product photo to products/{productId}/{uuid}.{ext}.
 * The bucket policy only accepts uploads from staff, and the bucket itself
 * enforces the 5 MB limit and image MIME types; we validate first for a clear message.
 */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ServiceError('VALIDATION', 'Use a JPG, PNG, WebP or AVIF image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ServiceError('VALIDATION', 'Images must be 5 MB or smaller.')
  }
  const path = `products/${productId}/${crypto.randomUUID()}.${EXT[file.type]}`
  const { error } = await getSupabase()
    .storage.from(env.productImagesBucket)
    .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
  if (error) throw new ServiceError('UNKNOWN', `Upload failed: ${error.message}`, error)
  return path
}

export async function removeProductImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await getSupabase().storage.from(env.productImagesBucket).remove(paths)
  if (error) throw new ServiceError('UNKNOWN', `Could not delete images: ${error.message}`, error)
}

// ── Payment screenshots (private bucket) ────────────────────────────────────
export const PAYMENT_PROOF_BUCKET = 'payment-proofs'
export const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const
const PROOF_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/**
 * Uploads a bank-transfer screenshot. Guests (userId null) write to payment-proofs/guest/{uuid}.{ext}
 * and can never read it back; signed-in users write to their own {userId}/ folder.
 * The bucket is private: staff read everything (storage RLS).
 */
export async function uploadPaymentProof(userId: string | null, file: File): Promise<string> {
  if (!(ALLOWED_PROOF_TYPES as readonly string[]).includes(file.type)) {
    throw new ServiceError('VALIDATION', 'Upload the screenshot as a JPG, PNG, WebP or HEIC image.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ServiceError('VALIDATION', 'The screenshot must be 5 MB or smaller.')
  }
  const path = `${userId ?? 'guest'}/${crypto.randomUUID()}.${PROOF_EXT[file.type]}`
  const { error } = await getSupabase()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new ServiceError('UNKNOWN', `Screenshot upload failed: ${error.message}`, error)
  return path
}

/** Short-lived link to view a private screenshot (owner or staff only). */
export async function paymentProofUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await getSupabase().storage.from(PAYMENT_PROOF_BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error || !data) throw new ServiceError('UNKNOWN', 'Could not open the payment screenshot.', error)
  return data.signedUrl
}

/** Review screenshots live in the public product-images bucket under reviews/ (staff upload only). */
export async function uploadReviewImage(file: File): Promise<string> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ServiceError('VALIDATION', 'Use a JPG, PNG, WebP or AVIF image.')
  }
  if (file.size > MAX_IMAGE_BYTES) throw new ServiceError('VALIDATION', 'Images must be 5 MB or smaller.')
  const path = `reviews/${crypto.randomUUID()}.${EXT[file.type]}`
  const { error } = await getSupabase()
    .storage.from(env.productImagesBucket)
    .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
  if (error) throw new ServiceError('UNKNOWN', `Upload failed: ${error.message}`, error)
  return path
}
