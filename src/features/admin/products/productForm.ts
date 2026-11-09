import { z } from 'zod'
import { COLLECTIONS, type Collection } from '@/constants/collections'
import type { ProductFormValues } from '@/services'
import type { AdminProduct } from '@/types/dashboard'

const pkr = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter an amount in PKR, e.g. 12500')

const optionalPkr = z.union([z.literal(''), pkr])

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a product name').max(140),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes only'),
    brandId: z.string().min(1, 'Choose a brand'),
    categoryId: z.string(),
    model: z.string().trim().max(120),
    description: z.string().trim().max(4000),
    collection: z.enum(COLLECTIONS),
    gender: z.enum(['men', 'women', 'unisex', 'kids']),
    condition: z.enum(['like_new', 'excellent', 'good', 'fair']),
    conditionNotes: z.string().trim().max(2000),
    originCountry: z.string().trim().max(60),
    color: z.string().trim().max(60),
    price: pkr,
    compareAtPrice: optionalPkr,
    purchasePrice: optionalPkr,
    supplierRef: z.string().trim().max(120),
    status: z.enum(['draft', 'active', 'sold_out', 'archived']),
    isFeatured: z.boolean(),
    defects: z.array(
      z.object({
        area: z.string().trim().min(1, 'Where on the shoe?').max(80),
        severity: z.enum(['minor', 'moderate', 'notable']),
        description: z.string().trim().min(1, 'Describe the flaw').max(300),
      }),
    ),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          sizeValue: z
            .string()
            .trim()
            .regex(/^\d{1,2}(\.5)?$/, 'EU size, e.g. 42 or 42.5'),
          sku: z
            .string()
            .trim()
            .toUpperCase()
            .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, '3–40 letters, numbers, dashes'),
          quantity: z.coerce.number<string | number>().int('Whole pairs only').min(0).max(999),
          priceOverride: optionalPkr,
        }),
      )
      .min(1, 'Add at least one size')
      .refine((v) => new Set(v.map((x) => x.sizeValue)).size === v.length, 'Each size can only appear once')
      .refine((v) => new Set(v.map((x) => x.sku.toUpperCase())).size === v.length, 'SKUs must be unique'),
  })
  .refine((v) => !v.compareAtPrice || Number(v.compareAtPrice) >= Number(v.price), {
    path: ['compareAtPrice'],
    message: 'Retail price should be at least the selling price',
  })

export type ProductFormInput = z.input<typeof productFormSchema>
export type ProductFormOutput = z.output<typeof productFormSchema>

const toMinor = (pkrString: string) => Math.round(Number(pkrString) * 100)
const toPkrString = (minor: number | null) => (minor == null ? '' : String(minor / 100))

export const COLLECTION_CODE: Record<Collection, string> = {
  PREMIUM: 'PRM',
  'A CATEGORY': 'ACA',
  'B CATEGORY': 'BCA',
}

/** Suggested SKU: RT-{tier}-{model fragment}-{size}, e.g. RT-PRM-J1LOW-42. */
export function suggestSku(collection: Collection, name: string, size: string) {
  const fragment =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (/\d/.test(w) ? w : w[0]))
      .join('')
      .slice(0, 8) || 'ITEM'
  return `RT-${COLLECTION_CODE[collection]}-${fragment}-${size.replace('.', '')}`
}

export function emptyProductForm(): ProductFormInput {
  return {
    name: '',
    slug: '',
    brandId: '',
    categoryId: '',
    model: '',
    description: '',
    collection: 'A CATEGORY',
    gender: 'unisex',
    condition: 'excellent',
    conditionNotes: '',
    originCountry: '',
    color: '',
    price: '',
    compareAtPrice: '',
    purchasePrice: '',
    supplierRef: '',
    status: 'draft',
    isFeatured: false,
    defects: [],
    variants: [{ sizeValue: '', sku: '', quantity: 1, priceOverride: '' }],
  }
}

export function productToForm(p: AdminProduct): ProductFormInput {
  return {
    name: p.name,
    slug: p.slug,
    brandId: p.brandId ?? '',
    categoryId: p.category?.id ?? '',
    model: p.model ?? '',
    description: p.description,
    collection: p.collection,
    gender: p.gender,
    condition: p.condition,
    conditionNotes: p.conditionNotes ?? '',
    originCountry: p.originCountry ?? '',
    color: p.color ?? '',
    price: toPkrString(p.price),
    compareAtPrice: toPkrString(p.compareAtPrice),
    purchasePrice: toPkrString(p.purchasePrice),
    supplierRef: p.supplierRef ?? '',
    status: p.status,
    isFeatured: p.isFeatured,
    defects: p.defects,
    variants: p.variants.map((v) => ({
      id: v.id,
      sizeValue: v.size.value,
      sku: v.sku,
      quantity: v.quantity,
      priceOverride: toPkrString(v.priceOverride),
    })),
  }
}

export function formToValues(f: ProductFormOutput, id?: string): ProductFormValues {
  return {
    id,
    slug: f.slug,
    name: f.name,
    brandId: f.brandId,
    categoryId: f.categoryId || null,
    model: f.model,
    description: f.description,
    collection: f.collection,
    gender: f.gender,
    condition: f.condition,
    conditionNotes: f.conditionNotes,
    defects: f.defects,
    originCountry: f.originCountry,
    color: f.color,
    price: toMinor(f.price),
    compareAtPrice: f.compareAtPrice ? toMinor(f.compareAtPrice) : null,
    purchasePrice: f.purchasePrice ? toMinor(f.purchasePrice) : null,
    supplierRef: f.supplierRef,
    status: f.status,
    isFeatured: f.isFeatured,
    variants: f.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      sizeValue: v.sizeValue,
      quantity: v.quantity,
      priceOverride: v.priceOverride ? toMinor(v.priceOverride) : null,
    })),
  }
}
