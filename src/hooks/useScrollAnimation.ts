import { useLayoutEffect, useRef, type RefObject } from 'react'
import { gsap } from '@/lib/gsap'

export interface ScrollAnimationContext {
  /** True at ≥1024px. Use it to enable pinning and parallax only on large screens. */
  isDesktop: boolean
}

/**
 * Runs GSAP/ScrollTrigger setup scoped to `scope`.
 * - Selector strings inside `build` only match descendants of `scope`.
 * - Skipped entirely for users who prefer reduced motion (content stays visible).
 * - Re-runs on breakpoint changes and reverts everything on unmount.
 */
export function useScrollAnimation(
  scope: RefObject<HTMLElement | null>,
  build: (ctx: ScrollAnimationContext) => void,
) {
  // Keep the latest build fn without re-running the effect on every render.
  const buildRef = useRef(build)
  useLayoutEffect(() => {
    buildRef.current = build
  })

  useLayoutEffect(() => {
    const el = scope.current
    if (!el) return

    const mm = gsap.matchMedia(el)
    mm.add(
      {
        isDesktop: '(min-width: 1024px)',
        motionOK: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { isDesktop, motionOK } = context.conditions as Record<string, boolean>
        if (!motionOK) return
        buildRef.current({ isDesktop })
      },
    )
    return () => mm.revert()
  }, [scope])
}
