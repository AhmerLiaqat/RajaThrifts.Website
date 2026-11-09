/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_URL?: string
  readonly VITE_CURRENCY?: string
  readonly VITE_LOCALE?: string
  readonly VITE_PRODUCT_IMAGES_BUCKET?: string
  readonly VITE_DEV_ADMIN_BYPASS?: string
  readonly VITE_USE_DEMO_CATALOG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
