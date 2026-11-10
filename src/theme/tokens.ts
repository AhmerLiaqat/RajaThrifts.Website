import type { Collection } from '@/constants/collections'

/** Raw brand palette, mirrored from src/styles/theme.css for use in JS (charts, canvas, GSAP). */
export const palette = {
  night: '#FFFFFF',
  carbon: '#FFFFFF',
  bone: '#111A33',
  sand: '#24358A',
  stone: '#6B7280',
  gold: '#C99A2E',
  grid: '#E3E6EE',
  axis: '#687089',
} as const

/**
 * JavaScript-side design tokens, used by Framer Motion and GSAP.
 * Colours, spacing and type live in src/styles/theme.css (Tailwind @theme).
 */
export const motion = {
  duration: { fast: 0.15, base: 0.3, slow: 0.45, reveal: 0.5, cinematic: 0.6 },
  /** Cubic-bezier arrays for Framer Motion. */
  ease: {
    outExpo: [0.16, 1, 0.3, 1] as const,
    inOutSmooth: [0.65, 0, 0.35, 1] as const,
  },
  /** Equivalent easing names for GSAP. */
  gsapEase: { outExpo: 'expo.out', inOutSmooth: 'power3.inOut' },
  stagger: { tight: 0.04, base: 0.08, loose: 0.14 },
} as const

export const zIndex = {
  header: 30,
  drawer: 40,
  modal: 50,
  toast: 60,
} as const

/**
 * Tailwind class sets per collection, so badges, chips and banners stay consistent.
 * Ladder: PREMIUM = sand (gold), A = bone (light), B = stone (muted).
 */
export const collectionTone: Record<Collection, { solid: string; soft: string; text: string }> = {
  PREMIUM: { solid: 'bg-gold text-brand-navy', soft: 'bg-gold-soft', text: 'text-[#8a6514]' },
  'A CATEGORY': { solid: 'bg-sand text-white', soft: 'bg-sand-100', text: 'text-sand' },
  'B CATEGORY': { solid: 'bg-stone text-white', soft: 'bg-surface-sunken', text: 'text-ink-muted' },
}
