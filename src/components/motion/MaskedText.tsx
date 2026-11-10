import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'

interface MaskedTextProps {
  /** Each line renders as its own block. */
  lines: Array<{ text: string; className?: string }>
  className?: string
  delay?: number
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean
}

/** Headline with a short, subtle fade-up. Screen readers get the plain sentence. */
export function MaskedText({ lines, className, delay = 0, immediate = false }: MaskedTextProps) {
  const trigger = immediate
    ? { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }

  return (
    <motion.span
      className={cn('block', className)}
      transition={{ duration: m.duration.slow, ease: m.ease.outExpo, delay }}
      {...trigger}
    >
      {lines.map((line, li) => (
        <span key={li} className={cn('block', line.className)}>
          {line.text}
        </span>
      ))}
    </motion.span>
  )
}
