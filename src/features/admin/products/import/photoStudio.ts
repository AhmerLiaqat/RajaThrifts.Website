/**
 * In-browser "photo studio" for product photos:
 *  1. decodes JPG/PNG/WebP (and iPhone HEIC) with the correct orientation,
 *  2. removes the background with the U²-Net-p model (Apache-2.0, ~4.5 MB, runs locally via
 *     onnxruntime-web; photos never leave the browser until you upload them),
 *  3. places the pair on a soft light-grey studio backdrop with a contact shadow,
 *  4. exports a consistent 1200×1500 (4:5) WebP that matches the storefront cards.
 *
 * Everything is lazy-loaded, so none of this code ships to customers.
 */

export type StudioMode = 'studio' | 'original'

export const OUTPUT_W = 1200
export const OUTPUT_H = 1500
const MODEL_URL = '/models/u2netp.onnx'
const MODEL_SIZE = 320

type Ort = typeof import('onnxruntime-web/wasm')
type Session = Awaited<ReturnType<Ort['InferenceSession']['create']>>

let modelPromise: Promise<{ ort: Ort; session: Session }> | null = null

/** Loads the background-removal model once (first call downloads ~4.5 MB + the runtime). */
export function loadStudioModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [ort, mjs, wasm] = await Promise.all([
        import('onnxruntime-web/wasm'),
        import('onnxruntime-web/ort-wasm-simd-threaded.mjs?url'),
        import('onnxruntime-web/ort-wasm-simd-threaded.wasm?url'),
      ])
      // Self-hosted runtime files (copied into the build by Vite), so no third-party CDN is needed.
      ort.env.wasm.wasmPaths = { mjs: mjs.default, wasm: wasm.default }
      // Single-threaded: works without cross-origin isolation headers.
      ort.env.wasm.numThreads = 1
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] })
      return { ort, session }
    })().catch((e) => {
      modelPromise = null
      throw e
    })
  }
  return modelPromise
}

const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)

/** True for files the importer can read (common image types, including iPhone HEIC). */
export function isSupportedImage(f: File) {
  return /^image\/(jpeg|png|webp|avif)$/i.test(f.type) || /\.(jpe?g|png|webp|avif)$/i.test(f.name) || isHeic(f)
}

async function decode(file: File): Promise<ImageBitmap> {
  let blob: Blob = file
  if (isHeic(file)) {
    const { default: heic2any } = await import('heic2any')
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    blob = Array.isArray(out) ? out[0] : out
  }
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  return { c, ctx }
}

/** Returns a 320×320 alpha mask (0..1) of the foreground, or null when the model is unsure. */
async function predictMask(src: CanvasImageSource): Promise<Float32Array> {
  const { ort, session } = await loadStudioModel()
  const { ctx } = canvas(MODEL_SIZE, MODEL_SIZE)
  ctx.drawImage(src, 0, 0, MODEL_SIZE, MODEL_SIZE)
  const { data } = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE)
  const n = MODEL_SIZE * MODEL_SIZE
  let max = 1
  for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i + 1], data[i + 2])
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]
  const input = new Float32Array(3 * n)
  for (let p = 0; p < n; p++) {
    for (let ch = 0; ch < 3; ch++) input[ch * n + p] = (data[p * 4 + ch] / max - mean[ch]) / std[ch]
  }
  const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]) }
  const out = await session.run(feeds)
  const pred = out[session.outputNames[0]].data as Float32Array
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < n; i++) {
    lo = Math.min(lo, pred[i])
    hi = Math.max(hi, pred[i])
  }
  const mask = new Float32Array(n)
  const span = hi - lo || 1
  for (let i = 0; i < n; i++) {
    // Normalise, then sharpen the edge a little so the cut-out looks clean.
    const v = (pred[i] - lo) / span
    mask[i] = Math.min(1, Math.max(0, (v - 0.12) / 0.76))
  }
  return mask
}

function maskBounds(mask: Float32Array) {
  let x0 = MODEL_SIZE
  let y0 = MODEL_SIZE
  let x1 = -1
  let y1 = -1
  let area = 0
  for (let y = 0; y < MODEL_SIZE; y++)
    for (let x = 0; x < MODEL_SIZE; x++) {
      if (mask[y * MODEL_SIZE + x] > 0.5) {
        area++
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1, coverage: area / (MODEL_SIZE * MODEL_SIZE) }
}

function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#f9fafc')
  g.addColorStop(1, '#eaedf4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const r = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.75)
  r.addColorStop(0, 'rgba(255,255,255,0.9)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = r
  ctx.fillRect(0, 0, w, h)
}

function toBlob(c: HTMLCanvasElement, type = 'image/webp', quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))), type, quality),
  )
}

export interface StudioResult {
  file: File
  /** Object URL for previews. Revoke when done. */
  previewUrl: string
  /** False when background removal was skipped or the model was not confident. */
  backgroundRemoved: boolean
}

/**
 * Turns one raw photo into a consistent 4:5 product photo.
 * `studio` removes the background and places the pair on the light backdrop;
 * `original` keeps the photo and only crops it to 4:5.
 */
export async function processPhoto(file: File, mode: StudioMode, outName: string): Promise<StudioResult> {
  const bmp = await decode(file)
  // Work on a capped copy so huge phone photos stay fast.
  const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height))
  const W = Math.round(bmp.width * scale)
  const H = Math.round(bmp.height * scale)
  const src = canvas(W, H)
  src.ctx.drawImage(bmp, 0, 0, W, H)
  bmp.close()

  const out = canvas(OUTPUT_W, OUTPUT_H)
  let removed = false

  if (mode === 'studio') {
    try {
      const mask = await predictMask(src.c)
      const b = maskBounds(mask)
      // Reject results that are obviously wrong (nothing found, or "everything is foreground").
      if (b && b.coverage > 0.015 && b.coverage < 0.92) {
        // Full-resolution alpha mask
        const m320 = canvas(MODEL_SIZE, MODEL_SIZE)
        const img = m320.ctx.createImageData(MODEL_SIZE, MODEL_SIZE)
        for (let i = 0; i < mask.length; i++) {
          img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255
          img.data[i * 4 + 3] = Math.round(mask[i] * 255)
        }
        m320.ctx.putImageData(img, 0, 0)
        const cut = canvas(W, H)
        cut.ctx.drawImage(src.c, 0, 0)
        cut.ctx.globalCompositeOperation = 'destination-in'
        cut.ctx.imageSmoothingQuality = 'high'
        cut.ctx.drawImage(m320.c, 0, 0, W, H)

        // Crop to the pair and fit it on the backdrop.
        const sx = (b.x0 / MODEL_SIZE) * W
        const sy = (b.y0 / MODEL_SIZE) * H
        const sw = ((b.x1 - b.x0) / MODEL_SIZE) * W
        const sh = ((b.y1 - b.y0) / MODEL_SIZE) * H
        const fit = Math.min((OUTPUT_W * 0.84) / sw, (OUTPUT_H * 0.66) / sh)
        const dw = sw * fit
        const dh = sh * fit
        const dx = (OUTPUT_W - dw) / 2
        const dy = OUTPUT_H * 0.53 - dh / 2

        paintBackdrop(out.ctx, OUTPUT_W, OUTPUT_H)
        // Contact shadow under the pair
        out.ctx.save()
        out.ctx.filter = 'blur(18px)'
        out.ctx.fillStyle = 'rgba(17,26,51,0.20)'
        out.ctx.beginPath()
        out.ctx.ellipse(OUTPUT_W / 2, dy + dh - 6, dw * 0.44, Math.max(14, dh * 0.045), 0, 0, Math.PI * 2)
        out.ctx.fill()
        out.ctx.restore()
        out.ctx.imageSmoothingQuality = 'high'
        out.ctx.drawImage(cut.c, sx, sy, sw, sh, dx, dy, dw, dh)
        removed = true
      }
    } catch (e) {
      console.warn('[photo studio] background removal failed, keeping the original photo', e)
    }
  }

  if (!removed) {
    // Centre-crop the original to 4:5.
    const target = OUTPUT_W / OUTPUT_H
    let cw = W
    let ch = W / target
    if (ch > H) {
      ch = H
      cw = H * target
    }
    out.ctx.imageSmoothingQuality = 'high'
    out.ctx.drawImage(src.c, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, OUTPUT_W, OUTPUT_H)
  }

  const blob = await toBlob(out.c)
  const f = new File([blob], `${outName}.webp`, { type: 'image/webp' })
  return { file: f, previewUrl: URL.createObjectURL(f), backgroundRemoved: removed }
}
