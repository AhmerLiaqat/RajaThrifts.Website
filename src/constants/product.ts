import type { ConditionGrade, DefectSeverity, ProductImageView } from '@/types/product'

/** Customer-facing explanation of each condition grade, best to worst. */
export const CONDITION_META: Record<ConditionGrade, { label: string; description: string; rank: number }> = {
  like_new: { label: 'Like new', description: 'No visible wear. Looks fresh out of the box.', rank: 4 },
  excellent: { label: 'Excellent', description: 'Light signs of wear only visible up close.', rank: 3 },
  good: { label: 'Good', description: 'Clear signs of wear, fully wearable, cleaned.', rank: 2 },
  fair: { label: 'Fair', description: 'Heavier wear or flaws, priced accordingly.', rank: 1 },
}

export const CONDITION_ORDER: ConditionGrade[] = ['fair', 'good', 'excellent', 'like_new']

export const DEFECT_SEVERITY_META: Record<DefectSeverity, { label: string; className: string }> = {
  minor: { label: 'Minor', className: 'border-bone/20 text-bone/80' },
  moderate: { label: 'Moderate', className: 'border-warning/50 text-warning' },
  notable: { label: 'Notable', className: 'border-danger/60 text-danger' },
}

export const IMAGE_VIEW_LABEL: Record<ProductImageView, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  sole: 'Sole',
  top: 'Top',
  detail: 'Detail',
  on_foot: 'On foot',
}
