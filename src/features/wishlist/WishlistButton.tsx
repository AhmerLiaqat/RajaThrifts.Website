import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useWishlist } from './useWishlist'

interface WishlistButtonProps {
  productId: string
  productName: string
  variant?: 'overlay' | 'outline'
  className?: string
}

/** Heart toggle. Overlay style sits on product imagery; outline style sits in panels. */
export function WishlistButton({
  productId,
  productName,
  variant = 'overlay',
  className,
}: WishlistButtonProps) {
  const wishlist = useWishlist()
  const saved = wishlist.has(productId)

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        wishlist.toggle(productId)
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      title={saved ? 'Saved to wishlist' : 'Save to wishlist'}
      className={cn(
        'grid place-items-center rounded-full transition-colors',
        variant === 'overlay'
          ? 'size-9 bg-night/60 text-bone backdrop-blur hover:bg-night/80'
          : 'h-14 w-14 shrink-0 border border-bone/25 text-bone hover:border-bone',
        saved && 'text-sand',
        className,
      )}
    >
      <motion.span
        key={String(saved)}
        initial={{ scale: saved ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className="grid place-items-center"
      >
        <Heart className={cn(variant === 'overlay' ? 'size-4' : 'size-5', saved && 'fill-sand')} />
      </motion.span>
    </motion.button>
  )
}
