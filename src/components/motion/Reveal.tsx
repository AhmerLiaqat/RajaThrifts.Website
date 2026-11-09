import { motion, type HTMLMotionProps } from 'framer-motion'
import { motion as m } from '@/theme/tokens'

interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number
  y?: number
}

/** Fades and lifts children into view once, when scrolled into the viewport. */
export function Reveal({ delay = 0, y = 28, children, ...props }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: m.duration.reveal, ease: m.ease.outExpo, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
