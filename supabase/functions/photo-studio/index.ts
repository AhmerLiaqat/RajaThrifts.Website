// Supabase Edge Function: AI photo studio for product photos (staff only).
//
// Replaces ONLY the background and lighting of a shoe photo with the store's studio look,
// using an OpenAI image-edit model. The shoe itself must stay exactly as photographed:
// thrift buyers rely on every crease, scuff and mark being real.
//
// Deploy:
//   supabase functions deploy photo-studio
//   supabase secrets set OPENAI_API_KEY=sk-...
//   (optional) supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-1.5
// Then set VITE_AI_PHOTO_STUDIO=true in the web app's environment and redeploy it.
//
// Request:  multipart/form-data { image: File (jpg/png/webp), view: front|side|back|sole|top|detail|on_foot }
// Response: { image: base64, mimeType }
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const MAX_BYTES = 12 * 1024 * 1024

const KEEP = `Edit this photo. Keep the shoe (or pair of shoes) EXACTLY as it is: same shape, colours, logos, \
stitching, laces, sole, and every crease, scuff, mark, stain and sign of wear. Do not repair, clean, smooth, \
recolour, redraw or "improve" the shoe in any way. Do not add or remove any detail on the shoe. \
Do not mirror or rotate it and do not change the camera angle.`

const BACKDROP = `Only change the background and lighting:
- Remove the original background completely, including floors, hands, boxes, tags and any other objects.
- Place the shoe on a clean professional e-commerce studio backdrop: a smooth, seamless light-grey gradient \
(top #F9FAFC fading to #EAEDF4), no texture, no props, no text, no logo.`

const FRAMING: Record<string, string> = {
  side: '- Keep the side view exactly as photographed, centred, filling about 80% of the frame width.',
  front: '- Keep the front / three-quarter angle exactly as photographed, centred, filling about 75% of the frame.',
  back: '- Keep the back/heel view exactly as photographed, centred, filling about 65% of the frame height.',
  sole: '- Keep the outsole view exactly as photographed, centred, filling about 75% of the frame height. Do not hide or alter any tread wear.',
  top: '- Keep the top-down view exactly as photographed, centred, filling about 75% of the frame.',
  detail: '- Keep the angle and crop exactly as photographed, centred, filling about 75% of the frame. This photo may show a flaw: keep it fully visible and unchanged.',
  on_foot: '- Keep the angle exactly as photographed, centred, filling about 75% of the frame.',
}

const FINISH = `- Add a soft, realistic contact shadow directly under the sole.
- Soft, even studio lighting with true-to-life colours (do not shift the shoe's colours).
- Leave generous empty backdrop above and below the shoe (the photo will be cropped to portrait 4:5).
- Sharp and high resolution, matching a premium sneaker store's product photos, consistent with the other photos of this shoe.`

function buildPrompt(view: string) {
  return [KEEP, '', BACKDROP, FRAMING[view] ?? FRAMING.detail, FINISH].join('\n')
}

function toBase64(bytes: Uint8Array) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'AI studio is not configured (OPENAI_API_KEY secret missing)' }, 503)

  // Staff only: the caller's own JWT is used, so RLS / is_staff() decide.
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Sign in as staff to use the AI studio' }, 401)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: isStaff, error: staffError } = await supabase.rpc('is_staff')
  if (staffError || isStaff !== true) return json({ error: 'Only staff can use the AI studio' }, 403)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Expected multipart/form-data' }, 400)
  }
  const image = form.get('image')
  const view = String(form.get('view') ?? 'detail')
  if (!(image instanceof File)) return json({ error: 'Missing image' }, 400)
  if (image.size > MAX_BYTES) return json({ error: 'Image is too large (max 12 MB)' }, 413)
  if (!/^image\/(jpeg|png|webp)$/.test(image.type)) return json({ error: 'Use a JPG, PNG or WebP image' }, 415)

  const model = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1.5'
  const body = new FormData()
  body.append('model', model)
  body.append('image', image, image.name || 'photo.jpg')
  body.append('prompt', buildPrompt(view))
  body.append('size', '1024x1536')
  body.append('quality', 'high')
  body.append('output_format', 'png')
  // Keep the input's details as close as possible (supported by gpt-image-1 / 1.5, not the mini model).
  if (/^gpt-image-1(\.5)?(-|$)/.test(model) && !model.includes('mini')) body.append('input_fidelity', 'high')

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  })
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('[photo-studio] OpenAI error', res.status, payload)
    const msg = payload?.error?.message ?? `Image service error (${res.status})`
    return json({ error: msg }, 502)
  }
  const b64: string | undefined = payload?.data?.[0]?.b64_json
  if (b64) return json({ image: b64, mimeType: 'image/png' })

  // Some models return a URL instead of base64.
  const url: string | undefined = payload?.data?.[0]?.url
  if (url) {
    const img = await fetch(url)
    if (img.ok) return json({ image: toBase64(new Uint8Array(await img.arrayBuffer())), mimeType: img.headers.get('content-type') ?? 'image/png' })
  }
  return json({ error: 'The image service returned no image' }, 502)
})
