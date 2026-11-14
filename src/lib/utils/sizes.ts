import type { ShoeSize } from '@/types/product'

type SizeLike = Pick<ShoeSize, 'value' | 'uk' | 'us'> & { cm?: string | null }

/**
 * Shoe size labels. Every pair stores its own EU, UK and US size (conversions vary by
 * brand, so there is no shared chart) plus an optional length in cm. Older listings may be
 * missing UK / US until re-saved.
 */
export function sizeParts(size: SizeLike): string[] {
  return [
    `EU ${size.value}`,
    size.uk ? `UK ${size.uk}` : null,
    size.us ? `US ${size.us}` : null,
    size.cm ? `${size.cm} cm` : null,
  ].filter((p): p is string => !!p)
}

/** "EU 42 · UK 8 · US 9 · 26.5 cm" (separator configurable; cm only when set). */
export const formatSize = (size: SizeLike, separator = ' · ') => sizeParts(size).join(separator)
