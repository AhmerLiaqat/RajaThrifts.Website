import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Older iPhones stay on iOS 15/16 (iPhone 7/8/X) and many are still in use. Vite's default
    // (Safari 16.4+) would leave them on a blank page; compile down so the shop runs there too.
    target: ['es2020', 'safari15', 'ios15', 'chrome87', 'edge88', 'firefox78'],
    cssTarget: ['safari15', 'ios15', 'chrome87', 'edge88', 'firefox78'],
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: cache well across deploys and keep the app chunk small.
        // [\\/] matches both POSIX and Windows path separators.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
            {
              name: 'vendor-motion',
              test: /node_modules[\\/](framer-motion|motion-dom|motion-utils|gsap)[\\/]/,
            },
            {
              // Small utilities shared by the storefront and recharts. Must be claimed before
              // 'vendor-charts', which otherwise pulls dependencies in recursively.
              name: 'vendor-ui',
              test: /node_modules[\\/](clsx|tailwind-merge|use-sync-external-store)[\\/]/,
            },
            {
              // Dashboard-only charting: kept out of the storefront's shared vendor chunk.
              name: 'vendor-charts',
              test: /node_modules[\\/](recharts|victory-vendor|d3-[a-z-]+|internmap|@reduxjs|react-redux|redux|reselect|immer|es-toolkit|decimal\.js-light)[\\/]/,
            },
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
