import { z } from 'zod'

/**
 * Single source of truth for runtime configuration.
 * Everything else imports `env` from here, never `import.meta.env` directly.
 *
 * Supabase keys are optional so the UI shell can run before a project exists;
 * use `env.isSupabaseConfigured` (or `getSupabase()`, which throws) to guard data access.
 */
const schema = z.object({
  VITE_SUPABASE_URL: z.url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_APP_NAME: z.string().default('Raja Thrifts'),
  VITE_APP_URL: z.url().default('http://localhost:5173'),
  VITE_CURRENCY: z.string().length(3).default('PKR'),
  VITE_LOCALE: z.string().default('en-PK'),
  VITE_PRODUCT_IMAGES_BUCKET: z.string().default('product-images'),
  VITE_DEV_ADMIN_BYPASS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  VITE_USE_DEMO_CATALOG: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  VITE_AI_PHOTO_STUDIO: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
})

// Treat empty strings from .env files as "not set".
const raw = Object.fromEntries(Object.entries(import.meta.env).filter(([, v]) => v !== ''))

const parsed = schema.safeParse(raw)

if (!parsed.success) {
  console.error('Invalid environment configuration:', z.treeifyError(parsed.error))
  throw new Error('Invalid environment configuration. Check your .env.local file.')
}

const e = parsed.data

/**
 * Hard stop if a privileged key was put in a VITE_ variable. Everything prefixed
 * VITE_ is bundled into public JavaScript, so a service-role / secret key there
 * would give every visitor full database access, bypassing RLS.
 * Accepts the legacy anon JWT or the new `sb_publishable_` key format.
 */
function assertPublicKey(key: string | undefined) {
  if (!key) return
  if (key.startsWith('sb_secret_'))
    throw new Error('VITE_SUPABASE_ANON_KEY is a SECRET key. Use the publishable/anon key.')
  const [, payload] = key.split('.')
  if (!payload) return
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
    if (claims.role && claims.role !== 'anon') {
      throw new Error(
        `VITE_SUPABASE_ANON_KEY has role "${claims.role}". Only the anon/publishable key may be used in the browser.`,
      )
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('VITE_SUPABASE_ANON_KEY')) throw err
    // Not a JWT we can read: let Supabase reject it if it is invalid.
  }
}
assertPublicKey(e.VITE_SUPABASE_ANON_KEY)

// Hosted builds (e.g. Netlify) only see variables set in the host's dashboard, never .env.local.
if (!import.meta.env.DEV && !(e.VITE_SUPABASE_URL && e.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    '[Raja Thrifts] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY were not set when this build was made, ' +
      'so the demo catalog is shown. Add them in your hosting provider\'s environment variables and redeploy.',
  )
}

export const env = {
  supabaseUrl: e.VITE_SUPABASE_URL,
  supabaseAnonKey: e.VITE_SUPABASE_ANON_KEY,
  isSupabaseConfigured: Boolean(e.VITE_SUPABASE_URL && e.VITE_SUPABASE_ANON_KEY),
  appName: e.VITE_APP_NAME,
  appUrl: e.VITE_APP_URL,
  currency: e.VITE_CURRENCY,
  locale: e.VITE_LOCALE,
  productImagesBucket: e.VITE_PRODUCT_IMAGES_BUCKET,
  /** Serve the in-memory demo catalog. Forced on until Supabase is configured. */
  useDemoCatalog: e.VITE_USE_DEMO_CATALOG || !(e.VITE_SUPABASE_URL && e.VITE_SUPABASE_ANON_KEY),
  /** Offer the AI photo studio (needs the `photo-studio` Edge Function + OPENAI_API_KEY secret). */
  aiPhotoStudio: e.VITE_AI_PHOTO_STUDIO,
  /** Only honoured in dev builds. */
  devAdminBypass: import.meta.env.DEV && e.VITE_DEV_ADMIN_BYPASS,
  isDev: import.meta.env.DEV,
} as const
