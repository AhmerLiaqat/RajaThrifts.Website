/** Calendar helpers on plain YYYY-MM-DD strings, in Pakistan time (the shop's books). */
const PKT = 'Asia/Karachi'

export const todayPKT = () => new Intl.DateTimeFormat('en-CA', { timeZone: PKT }).format(new Date())

const toUtc = (d: string) => new Date(`${d}T00:00:00Z`)
const fmt = (d: Date) => d.toISOString().slice(0, 10)

export const addDays = (d: string, days: number) => {
  const x = toUtc(d)
  x.setUTCDate(x.getUTCDate() + days)
  return fmt(x)
}
export const startOfMonth = (d: string) => `${d.slice(0, 7)}-01`
export const endOfMonth = (d: string) => {
  const x = toUtc(startOfMonth(d))
  x.setUTCMonth(x.getUTCMonth() + 1)
  x.setUTCDate(0)
  return fmt(x)
}
export const addMonths = (d: string, months: number) => {
  const x = toUtc(startOfMonth(d))
  x.setUTCMonth(x.getUTCMonth() + months)
  return fmt(x)
}
export const startOfYear = (d: string) => `${d.slice(0, 4)}-01-01`
export const daysBetween = (a: string, b: string) =>
  Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000)
export const isIsoDate = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUtc(s).getTime())

/** Bucket label for charts/tables. */
export function bucketLabel(bucket: string, granularity: 'day' | 'week' | 'month' | 'year') {
  const d = toUtc(bucket)
  if (granularity === 'year') return bucket.slice(0, 4)
  if (granularity === 'month')
    return d.toLocaleDateString('en-PK', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  const day = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return granularity === 'week' ? `Wk of ${day}` : day
}
