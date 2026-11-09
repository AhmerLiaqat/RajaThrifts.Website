import type { Collection } from '@/constants/collections'

/** Raw brand palette, mirrored from src/styles/theme.css for use in JS (charts, canvas, GSAP). */
export const palette = {
  night: '#1B2550',
  carbon: '#26336A',
  bone: '#F7F3EA',
  sand: '#E6C983',
  stone: '#B9B2A4',
} as const

/**
 * JavaScript-side design tokens, used by Framer Motion and GSAP.
 * Colours, spacing and type live in src/styles/theme.css (Tailwind @theme).
 */
export const motion = {
  duration: { fast: 0.15, base: 0.3, slow: 0.6, reveal: 0.9, cinematic: 1.4 },
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
  PREMIUM: { solid: 'bg-sand text-night', soft: 'bg-sand/12', text: 'text-sand' },
  'A CATEGORY': { solid: 'bg-bone text-night', soft: 'bg-bone/10', text: 'text-bone' },
  'B CATEGORY': { solid: 'bg-stone text-night', soft: 'bg-stone/12', text: 'text-stone' },
}
