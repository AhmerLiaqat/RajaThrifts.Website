import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { MaskedText } from '@/components/motion/MaskedText'
import { authAvailable } from '../hooks/useAuth'
import { SupabaseNotice } from '@/components/feedback/SupabaseNotice'
import { unsplash } from '@/mocks/demo-media'
import { motion as m } from '@/theme/tokens'

const SIDE_PHOTO = '1600269452121-4f2416e55c28'

/** Split-screen frame for sign in / register / reset password. */
export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-[calc(100dvh-5rem)] lg:grid-cols-2">
      <div className="grain relative hidden overflow-hidden lg:block">
        <motion.img
          src={unsplash(SIDE_PHOTO, 1400)}
          alt=""
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: m.ease.outExpo }}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-night/50" />
        <p className="absolute bottom-10 left-10 max-w-xs font-display text-3xl leading-tight font-medium text-bone">
          Every pair, honestly graded. Every order, tracked to your door.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-md">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 text-5xl leading-[0.9] font-semibold tracking-[-0.03em] uppercase">
            <MaskedText immediate lines={[{ text: title }]} />
          </h1>
          {!authAvailable && <SupabaseNotice feature="Accounts" className="mt-8" />}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
