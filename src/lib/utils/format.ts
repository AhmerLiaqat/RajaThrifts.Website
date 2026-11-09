import { env } from '@/config/env'
import type { MinorUnits } from '@/types/common'
import type { ShoeSize } from '@/types/product'

const currencyFormatter = new Intl.NumberFormat(env.locale, {
  style: 'currency',
  currency: env.currency,
  maximumFractionDigits: 0,
})

const currencyCodeFormatter = new Intl.NumberFormat(env.locale, {
  style: 'currency',
  currency: env.currency,
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
})

/** Formats an integer amount in minor units (e.g. paisa) as display currency, e.g. "Rs 24,500". */
export const formatPrice = (amount: MinorUnits) => currencyFormatter.format(amount / 100)

/** Unambiguous form with the ISO code, e.g. "PKR 24,500". Used where price is the focus. */
export const formatPriceCode = (amount: MinorUnits) =>
  currencyCodeFormatter.format(amount / 100).replace(/ /g, ' ')

export const formatSize = (size: ShoeSize) => `${size.system} ${size.value}`

export const discountPercent = (price: MinorUnits, compareAt: MinorUnits | null) =>
  compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0

const dateTimeFormatter = new Intl.DateTimeFormat(env.locale, { dateStyle: 'medium', timeStyle: 'short' })

/** e.g. "9 Nov 2026, 3:15 pm" */
export const formatDate = (iso: string) => dateTimeFormatter.format(new Date(iso))
