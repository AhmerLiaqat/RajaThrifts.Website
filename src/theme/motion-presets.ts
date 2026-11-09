import type { Variants } from 'framer-motion'
import { motion } from './tokens'

/** Reusable Framer Motion variants. GSAP is reserved for scroll-driven/timeline work. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motion.duration.slow, ease: motion.ease.outExpo },
  },
}

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: motion.stagger.base } },
}

export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: motion.duration.base } },
  exit: { opacity: 0, transition: { duration: motion.duration.fast } },
}
