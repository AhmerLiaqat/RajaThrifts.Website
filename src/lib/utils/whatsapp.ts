/** "0300 1234567" / "+92 300 1234567" → "923001234567" (the digits-only format wa.me needs). */
export function normaliseWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 11) return `92${digits.slice(1)}`
  return digits
}

/** "923001234567" → "+92 300 1234567" for display. */
export function formatWhatsappNumber(digits: string): string {
  return digits.startsWith('92') && digits.length === 12
    ? `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`
    : `+${digits}`
}
