/**
 * In-browser "photo studio" for product photos.
 *
 * Local engine (`studio`, free, photos never leave the browser until upload):
 *  1. decodes JPG/PNG/WebP (and iPhone HEIC) with the correct orientation,
 *  2. finds the shoe(s) with the U²-Net-p model (Apache-2.0, ~4.5 MB, onnxruntime-web),
 *     averaged with a mirrored pass, and drops stray objects (hands, boxes, clutter),
 *  3. re-runs the model on a tight crop around the shoe for a much sharper mask,
 *  4. refines the edge against the real photo (guided filter) and removes the old
 *     background's colour from the edge pixels, so there is no halo,
 *  5. places the shoe on the light-grey studio backdrop with a silhouette contact shadow,
 *     framed per angle (side / front / back / sole…),
 *  6. exports a consistent 1200×1500 (4:5) WebP that matches the storefront cards.
 *
 * AI engine (`ai`, optional): sends the photo to the `photo-studio` Edge Function, which
 * asks an image model to replace only the background and lighting (see aiStudio.ts).
 * Falls back to the local engine if it is unavailable.
 *
 * Everything is lazy-loaded, so none of this code ships to customers.
 */
import type { ProductImageView } from '@/types/product'

export type StudioMode = 'studio' | 'ai' | 'original'

export const OUTPUT_W = 1200
export const OUTPUT_H = 1500
const MODEL_URL = '/models/u2netp.onnx'
const MODEL_SIZE = 320
/** Long side of the working image for edge refinement. */
const REFINE_MAX = 1600

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

async function decode(file: Blob & { name?: string }): Promise<ImageBitmap> {
  let blob: Blob = file
  if (file instanceof File && isHeic(file)) {
    const { default: heic2any } = await import('heic2any')
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    blob = Array.isArray(out) ? out[0] : out
  }
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  return { c, ctx }
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/* ── Model ───────────────────────────────────────────────────────────── */

/** Raw foreground probability (0..1) on a 320×320 grid for one region of the image. */
async function predictOnce(src: HTMLCanvasElement, r: Rect, flip: boolean): Promise<Float32Array> {
  const { ort, session } = await loadStudioModel()
  const { ctx } = canvas(MODEL_SIZE, MODEL_SIZE)
  ctx.imageSmoothingQuality = 'high'
  if (flip) {
    ctx.translate(MODEL_SIZE, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, MODEL_SIZE, MODEL_SIZE)
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
  const span = hi - lo || 1
  const mask = new Float32Array(n)
  for (let y = 0; y < MODEL_SIZE; y++)
    for (let x = 0; x < MODEL_SIZE; x++) {
      const sx = flip ? MODEL_SIZE - 1 - x : x
      mask[y * MODEL_SIZE + x] = (pred[y * MODEL_SIZE + sx] - lo) / span
    }
  return mask
}

/** Test-time augmentation: average the normal and mirrored predictions (cleaner, steadier mask). */
async function predict(src: HTMLCanvasElement, r: Rect): Promise<Float32Array> {
  const a = await predictOnce(src, r, false)
  const b = await predictOnce(src, r, true)
  for (let i = 0; i < a.length; i++) a[i] = (a[i] + b[i]) / 2
  return a
}

/* ── Mask clean-up ───────────────────────────────────────────────────── */

/**
 * Keeps the shoe(s) and drops stray blobs. A pair is often two separate regions, so every
 * region at least 12% the size of the largest one is kept. Returns the kept-region mask
 * (dilated a little) and its bounds on the 320 grid, or null when nothing usable was found.
 */
function mainRegions(mask: Float32Array) {
  const S = MODEL_SIZE
  const n = S * S
  const labels = new Int32Array(n)
  const areas: number[] = [0]
  const stack: number[] = []
  for (let i = 0; i < n; i++) {
    if (labels[i] || mask[i] <= 0.5) continue
    const id = areas.length
    let area = 0
    labels[i] = id
    stack.push(i)
    while (stack.length) {
      const p = stack.pop()!
      area++
      const x = p % S
      const y = (p - x) / S
      const nb = [x > 0 ? p - 1 : -1, x < S - 1 ? p + 1 : -1, y > 0 ? p - S : -1, y < S - 1 ? p + S : -1]
      for (const q of nb) {
        if (q >= 0 && !labels[q] && mask[q] > 0.5) {
          labels[q] = id
          stack.push(q)
        }
      }
    }
    areas.push(area)
  }
  const largest = Math.max(0, ...areas)
  if (!largest) return null
  const keep = areas.map((a) => a >= largest * 0.12 && a >= n * 0.002)

  // Dilate the kept regions by a few cells so soft edges (laces, frayed fabric) survive.
  const R = 4
  const kept = new Uint8Array(n)
  let x0 = S
  let y0 = S
  let x1 = -1
  let y1 = -1
  let area = 0
  for (let i = 0; i < n; i++) {
    if (!keep[labels[i]] || !labels[i]) continue
    area++
    const x = i % S
    const y = (i - x) / S
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
    for (let dy = -R; dy <= R; dy++) {
      const yy = y + dy
      if (yy < 0 || yy >= S) continue
      for (let dx = -R; dx <= R; dx++) {
        const xx = x + dx
        if (xx >= 0 && xx < S) kept[yy * S + xx] = 1
      }
    }
  }
  if (x1 < 0) return null
  return { kept, x0, y0, x1: x1 + 1, y1: y1 + 1, coverage: area / n }
}

/* ── Image maths ─────────────────────────────────────────────────────── */

/** Mean over a (2r+1)² window, clamped at the borders. O(n) regardless of r. */
function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  const pre = new Float64Array(Math.max(w, h) + 1)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + src[row + x]
    for (let x = 0; x < w; x++) {
      const a = Math.max(0, x - r)
      const b = Math.min(w - 1, x + r)
      tmp[row + x] = (pre[b + 1] - pre[a]) / (b - a + 1)
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) pre[y + 1] = pre[y] + tmp[y * w + x]
    for (let y = 0; y < h; y++) {
      const a = Math.max(0, y - r)
      const b = Math.min(h - 1, y + r)
      out[y * w + x] = (pre[b + 1] - pre[a]) / (b - a + 1)
    }
  }
  return out
}

/** Guided filter (He et al.): snaps the coarse mask `p` to the real edges of the guide image. */
function guidedFilter(I: Float32Array, p: Float32Array, w: number, h: number, r: number, eps: number) {
  const n = w * h
  const Ip = new Float32Array(n)
  const II = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    Ip[i] = I[i] * p[i]
    II[i] = I[i] * I[i]
  }
  const mI = boxMean(I, w, h, r)
  const mP = boxMean(p, w, h, r)
  const mIp = boxMean(Ip, w, h, r)
  const mII = boxMean(II, w, h, r)
  const a = Ip // reuse buffers
  const b = II
  for (let i = 0; i < n; i++) {
    const varI = mII[i] - mI[i] * mI[i]
    const cov = mIp[i] - mI[i] * mP[i]
    a[i] = cov / (varI + eps)
    b[i] = mP[i] - a[i] * mI[i]
  }
  const mA = boxMean(a, w, h, r)
  const mB = boxMean(b, w, h, r)
  const q = mI // reuse
  for (let i = 0; i < n; i++) q[i] = mA[i] * I[i] + mB[i]
  return q
}

/** Resamples a 320×320 mask into a w×h float mask (bilinear). */
function upsampleMask(mask: Float32Array, w: number, h: number): Float32Array {
  const S = MODEL_SIZE
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const fy = Math.min(S - 1, Math.max(0, ((y + 0.5) * S) / h - 0.5))
    const y0 = Math.floor(fy)
    const y1 = Math.min(S - 1, y0 + 1)
    const ty = fy - y0
    for (let x = 0; x < w; x++) {
      const fx = Math.min(S - 1, Math.max(0, ((x + 0.5) * S) / w - 0.5))
      const x0 = Math.floor(fx)
      const x1 = Math.min(S - 1, x0 + 1)
      const tx = fx - x0
      const top = mask[y0 * S + x0] * (1 - tx) + mask[y0 * S + x1] * tx
      const bot = mask[y1 * S + x0] * (1 - tx) + mask[y1 * S + x1] * tx
      out[y * w + x] = top * (1 - ty) + bot * ty
    }
  }
  return out
}

/* ── Cut-out ─────────────────────────────────────────────────────────── */

interface Cutout {
  /** Transparent PNG-like canvas of the shoe(s). */
  c: HTMLCanvasElement
  /** Tight bounds of the shoe inside `c`. */
  box: Rect
}

async function cutOut(src: HTMLCanvasElement): Promise<Cutout | null> {
  const W = src.width
  const H = src.height

  // Pass 1: locate the shoe(s) in the whole photo.
  const coarse = mainRegions(await predict(src, { x: 0, y: 0, w: W, h: H }))
  // Reject results that are obviously wrong (nothing found, or "everything is foreground").
  if (!coarse || coarse.coverage < 0.012 || coarse.coverage > 0.9) return null

  // Pass 2: re-run on a padded crop around the shoe so the model sees it at higher resolution.
  const bx = (coarse.x0 / MODEL_SIZE) * W
  const by = (coarse.y0 / MODEL_SIZE) * H
  const bw = ((coarse.x1 - coarse.x0) / MODEL_SIZE) * W
  const bh = ((coarse.y1 - coarse.y0) / MODEL_SIZE) * H
  const pad = Math.max(bw, bh) * 0.12
  const crop: Rect = {
    x: Math.max(0, Math.floor(bx - pad)),
    y: Math.max(0, Math.floor(by - pad)),
    w: 0,
    h: 0,
  }
  crop.w = Math.min(W, Math.ceil(bx + bw + pad)) - crop.x
  crop.h = Math.min(H, Math.ceil(by + bh + pad)) - crop.y

  const fine = await predict(src, crop)
  const fineRegions = mainRegions(fine)
  if (!fineRegions) return null

  // Working canvas for the crop, capped for speed.
  const k = Math.min(1, REFINE_MAX / Math.max(crop.w, crop.h))
  const w = Math.max(1, Math.round(crop.w * k))
  const h = Math.max(1, Math.round(crop.h * k))
  const work = canvas(w, h)
  work.ctx.imageSmoothingQuality = 'high'
  work.ctx.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h)
  const img = work.ctx.getImageData(0, 0, w, h)
  const px = img.data
  const n = w * h

  // Coarse alpha: fine prediction limited to the kept regions of both passes (kills stray blobs).
  const gate = new Float32Array(MODEL_SIZE * MODEL_SIZE)
  for (let i = 0; i < gate.length; i++) gate[i] = fineRegions.kept[i] ? fine[i] : 0
  const p = upsampleMask(gate, w, h)
  for (let y = 0; y < h; y++) {
    // Map back to pass-1 grid to also respect the first detection.
    const gy = Math.min(MODEL_SIZE - 1, Math.floor(((crop.y + (y + 0.5) / k) / H) * MODEL_SIZE))
    for (let x = 0; x < w; x++) {
      const gx = Math.min(MODEL_SIZE - 1, Math.floor(((crop.x + (x + 0.5) / k) / W) * MODEL_SIZE))
      if (!coarse.kept[gy * MODEL_SIZE + gx]) p[y * w + x] = 0
    }
  }

  // Edge refinement against the photo's luminance.
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255
  const radius = Math.max(4, Math.round(Math.max(w, h) / 140))
  const q = guidedFilter(lum, p, w, h, radius, 2e-3)
  const alpha = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = (q[i] - 0.1) / 0.8
    // Never let the refinement pull in background far from the model's mask.
    alpha[i] = p[i] < 0.02 ? 0 : Math.min(1, Math.max(0, v))
  }

  // Colour decontamination: estimate the local background colour and remove it from edge pixels.
  const bgR = Math.max(6, Math.round(Math.max(w, h) / 40))
  const inv = new Float32Array(n)
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)]
  for (let i = 0; i < n; i++) {
    inv[i] = 1 - alpha[i]
    for (let c = 0; c < 3; c++) ch[c][i] = px[i * 4 + c] * inv[i]
  }
  const invMean = boxMean(inv, w, h, bgR)
  const bg = ch.map((c) => boxMean(c, w, h, bgR))

  // Gentle exposure lift only (no colour shift): bright parts of the shoe reach studio white.
  const lums: number[] = []
  for (let i = 0; i < n; i += 7) if (alpha[i] > 0.9) lums.push(lum[i] * 255)
  lums.sort((a, b) => a - b)
  const p98 = lums.length ? lums[Math.floor(lums.length * 0.98)] : 255
  const gain = Math.min(1.15, Math.max(1, 240 / Math.max(1, p98)))

  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let i = 0; i < n; i++) {
    const a = alpha[i]
    if (a <= 0) {
      px[i * 4 + 3] = 0
      continue
    }
    for (let c = 0; c < 3; c++) {
      let v = px[i * 4 + c]
      if (a < 0.98 && invMean[i] > 1e-3) {
        const b = bg[c][i] / invMean[i]
        v = (v - (1 - a) * b) / a
      }
      px[i * 4 + c] = Math.min(255, Math.max(0, v * gain))
    }
    px[i * 4 + 3] = Math.round(a * 255)
    if (a > 0.5) {
      const x = i % w
      const y = (i - x) / w
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  work.ctx.putImageData(img, 0, 0)
  return { c: work.c, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } }
}

/* ── Composition ─────────────────────────────────────────────────────── */

export function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
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

/** How much of the frame the shoe may fill, per angle (matches the studio brief). */
const FRAMING: Record<ProductImageView | 'default', { w: number; h: number }> = {
  side: { w: 0.8, h: 0.6 },
  front: { w: 0.75, h: 0.7 },
  back: { w: 0.7, h: 0.65 },
  sole: { w: 0.8, h: 0.75 },
  top: { w: 0.75, h: 0.75 },
  detail: { w: 0.8, h: 0.75 },
  on_foot: { w: 0.8, h: 0.8 },
  default: { w: 0.8, h: 0.66 },
}

function compose(cut: Cutout, view: ProductImageView | undefined, out: CanvasRenderingContext2D) {
  const f = FRAMING[view ?? 'default']
  const { box } = cut
  const fit = Math.min((OUTPUT_W * f.w) / box.w, (OUTPUT_H * f.h) / box.h)
  const dw = box.w * fit
  const dh = box.h * fit
  const dx = (OUTPUT_W - dw) / 2
  const dy = OUTPUT_H * 0.52 - dh / 2

  paintBackdrop(out, OUTPUT_W, OUTPUT_H)

  // Silhouette of the shoe, used to cast shadows that follow its real outline.
  const sil = canvas(dw, dh)
  sil.ctx.drawImage(cut.c, box.x, box.y, box.w, box.h, 0, 0, dw, dh)
  sil.ctx.globalCompositeOperation = 'source-in'
  sil.ctx.fillStyle = 'rgb(17,26,51)'
  sil.ctx.fillRect(0, 0, dw, dh)

  const base = dy + dh
  out.save()
  // Wide, very soft ambient shadow
  out.filter = 'blur(28px)'
  out.fillStyle = 'rgba(17,26,51,0.10)'
  out.beginPath()
  out.ellipse(OUTPUT_W / 2, base - 4, dw * 0.46, Math.max(16, dh * 0.05), 0, 0, Math.PI * 2)
  out.fill()
  // Ground shadow: the silhouette flattened onto the floor
  out.filter = `blur(${Math.max(6, dh * 0.025)}px)`
  out.globalAlpha = 0.22
  out.drawImage(sil.c, dx, base - dh * 0.05, dw, dh * 0.08)
  // Tight contact shadow right under the sole
  out.filter = 'blur(3px)'
  out.globalAlpha = 0.3
  out.drawImage(sil.c, dx + dw * 0.01, base - dh * 0.018, dw * 0.98, dh * 0.03)
  out.restore()

  out.imageSmoothingQuality = 'high'
  out.drawImage(cut.c, box.x, box.y, box.w, box.h, dx, dy, dw, dh)
}

/** Fills the 4:5 output with an image, centre-cropped. */
export function coverInto(out: CanvasRenderingContext2D, src: CanvasImageSource, W: number, H: number) {
  const target = OUTPUT_W / OUTPUT_H
  let cw = W
  let ch = W / target
  if (ch > H) {
    ch = H
    cw = H * target
  }
  out.imageSmoothingQuality = 'high'
  out.drawImage(src, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, OUTPUT_W, OUTPUT_H)
}

function toBlob(c: HTMLCanvasElement, type = 'image/webp', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo.'))), type, quality),
  )
}

export interface StudioResult {
  file: File
  /** Object URL for previews. Revoke when done. */
  previewUrl: string
  /** False when background removal was skipped or failed. */
  backgroundRemoved: boolean
  /** Which engine produced the photo. */
  engine: 'ai' | 'local' | 'original'
  /** Set when the requested engine could not be used (e.g. AI unavailable → local). */
  note?: string
}

export interface ProcessOptions {
  /** The angle this photo shows; sets the framing (and the AI brief). */
  view?: ProductImageView
}

/**
 * Turns one raw photo into a consistent 4:5 product photo.
 * `studio` removes the background locally, `ai` uses the AI studio (falls back to `studio`),
 * `original` keeps the photo and only crops it to 4:5.
 */
export async function processPhoto(
  file: File,
  mode: StudioMode,
  outName: string,
  opts: ProcessOptions = {},
): Promise<StudioResult> {
  const bmp = await decode(file)
  // Work on a capped copy so huge phone photos stay fast.
  const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height))
  const W = Math.round(bmp.width * scale)
  const H = Math.round(bmp.height * scale)
  const src = canvas(W, H)
  src.ctx.drawImage(bmp, 0, 0, W, H)
  bmp.close()

  const out = canvas(OUTPUT_W, OUTPUT_H)
  let engine: StudioResult['engine'] = 'original'
  let note: string | undefined

  if (mode === 'ai') {
    try {
      const { aiStudioEdit } = await import('./aiStudio')
      const edited = await decode(await aiStudioEdit(src.c, opts.view))
      coverInto(out.ctx, edited, edited.width, edited.height)
      edited.close()
      engine = 'ai'
    } catch (e) {
      console.warn('[photo studio] AI studio failed, using the local studio', e)
      note = `AI studio unavailable (${(e as Error).message}). Used the local studio instead.`
    }
  }

  if (engine === 'original' && mode !== 'original') {
    try {
      const cut = await cutOut(src.c)
      if (cut) {
        compose(cut, opts.view, out.ctx)
        engine = 'local'
      }
    } catch (e) {
      console.warn('[photo studio] background removal failed, keeping the original photo', e)
    }
  }

  if (engine === 'original') coverInto(out.ctx, src.c, W, H)

  const blob = await toBlob(out.c)
  const f = new File([blob], `${outName}.webp`, { type: 'image/webp' })
  return { file: f, previewUrl: URL.createObjectURL(f), backgroundRemoved: engine !== 'original', engine, note }
}
