import { Fragment } from 'react'
import { SparkleIcon } from '@/components/motion/Sparkles'
import { cn } from '@/lib/utils/cn'

const DEFAULT_ITEMS = [
  'PREMIUM',
  'A CATEGORY',
  'B CATEGORY',
  'Imported',
  'Graded',
  'Cleaned',
  'Honestly described',
]

/** Infinite ticker. The content is duplicated once so the -50% loop is seamless. */
export function MarqueeBand({
  items = DEFAULT_ITEMS,
  reverse = false,
  className,
}: {
  items?: string[]
  reverse?: boolean
  className?: string
}) {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <Fragment key={item}>
          <span className="px-6 font-display text-[clamp(1.1rem,2.4vw,2rem)] font-medium tracking-tight whitespace-nowrap uppercase sm:px-10">
            {item}
          </span>
          <SparkleIcon className="size-4 text-sand" />
        </Fragment>
      ))}
    </div>
  )

  return (
    <div className={cn('glass overflow-hidden border-x-0 py-5 text-bone', className)}>
      <div
        className={cn(
          'flex w-max hover:[animation-play-state:paused]',
          reverse ? 'animate-marquee-reverse' : 'animate-marquee',
        )}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
