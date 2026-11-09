import type { ExpenseCategory } from '@/types/finance'

/** Operating expense categories (mirrors public.expense_category) with common sub-types. */
export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; suggestions: string[] }> = {
  advertising: {
    label: 'Advertising',
    suggestions: ['Meta ads', 'TikTok ads', 'Google ads', 'Influencer', 'Photography'],
  },
  packaging: {
    label: 'Packaging',
    suggestions: ['Shoe boxes', 'Mailer bags', 'Tissue & fillers', 'Stickers & labels'],
  },
  delivery: {
    label: 'Delivery costs paid',
    suggestions: ['Courier charges', 'Return (RTO) charges', 'Own rider', 'Fuel'],
  },
  other: {
    label: 'Other operating',
    suggestions: [
      'Rent',
      'Salaries',
      'Utilities',
      'Internet & phone',
      'Software',
      'Bank & wallet fees',
      'Cleaning supplies',
    ],
  },
}
