/**
 * Client for the optional AI photo studio (Supabase Edge Function `photo-studio`).
 * The function holds the image-model API key and checks the caller is staff; the browser
 * only sends the photo and the angle it shows.
 */
import { env } from '@/config/env'
import { getSupabase } from '@/lib/supabase/client'
import type { ProductImageView } from '@/types/product'

/** Show the AI option only when it has been switched on for this build. */
export const isAiStudioEnabled = env.aiPhotoStudio && env.isSupabaseConfigured

/** Long side sent to the AI. Larger adds upload time without improving the result. */
const UPLOAD_MAX = 1536

function toJpeg(src: HTMLCanvasElement): Promise<Blob> {
  const k = Math.min(1, UPLOAD_MAX / Math.max(src.width, src.height))
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * k)
  c.height = Math.round(src.height * k)
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))), 'image/jpeg', 0.92),
  )
}

function base64ToBlob(b64: string, type: string) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** Returns the AI-edited photo (studio backdrop + lighting, shoe untouched). */
export async function aiStudioEdit(src: HTMLCanvasElement, view?: ProductImageView): Promise<Blob> {
  if (!isAiStudioEnabled) throw new Error('AI studio is not enabled')
  const body = new FormData()
  body.append('image', await toJpeg(src), 'photo.jpg')
  body.append('view', view ?? 'detail')

  const { data, error } = await getSupabase().functions.invoke<{ image: string; mimeType: string }>(
    'photo-studio',
    { body },
  )
  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        message = ((await ctx.json()) as { error?: string }).error ?? message
      } catch {
        /* keep the generic message */
      }
    }
    throw new Error(message)
  }
  if (!data?.image) throw new Error('The AI studio returned no image')
  return base64ToBlob(data.image, data.mimeType || 'image/png')
}
