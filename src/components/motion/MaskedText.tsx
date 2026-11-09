import { motion } from 'framer-motion'
import { Fragment } from 'react'
import { cn } from '@/lib/utils/cn'
import { motion as m } from '@/theme/tokens'

interface MaskedTextProps {
  /** Each line is revealed word by word from behind a mask. */
  lines: Array<{ text: string; className?: string }>
  className?: string
  delay?: number
  /** Animate on mount (hero) instead of when scrolled into view. */
  immediate?: boolean
}

/**
 * Cinematic headline reveal: each word slides up from behind its own clipping mask.
 * Screen readers get the plain sentence via aria-label.
 */
export function MaskedText({ lines, className, delay = 0, immediate = false }: MaskedTextProps) {
  const label = lines.map((l) => l.text).join(' ')
  const words = lines.map((l) => l.text.split(' '))
  // Running word offset per line, so the stagger continues across lines.
  const offsets = words.map((_, li) => words.slice(0, li).reduce((n, w) => n + w.length, 0))

  const trigger = immediate
    ? { initial: 'hidden', animate: 'visible' }
    : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, margin: '-10% 0px' } }

  return (
    <motion.span aria-label={label} role="text" className={cn('block', className)} {...trigger}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden className={cn('block', line.className)}>
          {words[li].map((word, wi) => {
            const i = offsets[li] + wi
            // The space sits OUTSIDE the mask so it collapses at line ends.
            // Inside, it would wrap onto its own line when a word fills the column.
            return (
              <Fragment key={`${li}-${i}`}>
                <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <motion.span
                    className="inline-block will-change-transform"
                    variants={{
                      hidden: { y: '110%', rotate: 4 },
                      visible: {
                        y: '0%',
                        rotate: 0,
                        transition: {
                          duration: m.duration.cinematic,
                          ease: m.ease.outExpo,
                          delay: delay + i * 0.09,
                        },
                      },
                    }}
                  >
                    {word}
                  </motion.span>
                </span>{' '}
              </Fragment>
            )
          })}
        </span>
      ))}
    </motion.span>
  )
}
