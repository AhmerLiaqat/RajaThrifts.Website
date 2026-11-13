import { adminProductService, type ProductFormValues } from '@/services'
import { slugify } from '@/services/products/admin-product.service'
import { COLLECTION_CODE } from '../productForm'
import type { BrandRef, ProductImageView } from '@/types/product'
import { MIN_PRODUCT_IMAGES } from '@/types/product'
import { COLLECTION_META } from '@/constants/collections'
import { CONDITION_META } from '@/constants/product'
import type { ImportRow } from './spreadsheet'
import type { StudioResult } from './photoStudio'

export const VIEWS: ProductImageView[] = ['front', 'side', 'back', 'sole']
const toMinor = (pkr: number) => Math.round(pkr * 100)

/** Batch stamp used in SKUs, e.g. 261110 for 10 Nov 2026. Keeps SKUs unique across shipments. */
export const batchStamp = (d = new Date()) =>
  `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

const skuPart = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'X'

export function skuFor(row: ImportRow, size: string, stamp: string) {
  return `RT-${COLLECTION_CODE[row.collection!]}-${stamp}-${skuPart(row.code)}-${size.replace('.', '')}`.slice(0, 40)
}

/** Finds a brand by name (case-insensitive) or creates it once per import run. */
export function brandResolver(existing: BrandRef[]) {
  const byName = new Map(existing.map((b) => [b.name.trim().toLowerCase(), Promise.resolve(b.id)]))
  return (name: string) => {
    const key = name.trim().toLowerCase()
    let id = byName.get(key)
    if (!id) {
      const pretty = name.trim().replace(/\s+/g, ' ')
      id = adminProductService.createBrand(pretty).then((b) => b.id)
      // A failed creation should be retried by the next row, not cached.
      id.catch(() => byName.delete(key))
      byName.set(key, id)
    }
    return id
  }
}

export interface ImportOutcome {
  productId: string
  published: boolean
  photosUploaded: number
  photoErrors: string[]
}

/** Creates one product (as a draft), uploads its photos, then publishes it if it has enough photos. */
export async function importOne(
  row: ImportRow,
  photos: StudioResult[],
  opts: { brandId: string; stamp: string; publish: boolean },
): Promise<ImportOutcome> {
  const random = Math.random().toString(36).slice(2, 6)
  const description =
    row.description ||
    `${row.brand} ${row.name}. Imported pre-owned pair, hand-inspected and graded ${
      COLLECTION_META[row.collection!].label
    } (${CONDITION_META[row.condition!].label.toLowerCase()} condition).`
  const values: ProductFormValues = {
    slug: `${slugify(`${row.brand} ${row.name} ${row.sizes[0] ?? ''}`).slice(0, 70)}-${random}`.replace(/^-+/, ''),
    name: row.name,
    brandId: opts.brandId,
    categoryId: null,
    model: row.model,
    description,
    collection: row.collection!,
    gender: row.gender,
    condition: row.condition!,
    conditionNotes: row.notes,
    defects: [],
    originCountry: '',
    color: row.colour,
    price: toMinor(row.price!),
    compareAtPrice: row.originalPrice != null ? toMinor(row.originalPrice) : null,
    status: 'draft',
    isFeatured: false,
    purchasePrice: row.costPrice != null ? toMinor(row.costPrice) : null,
    supplierRef: '',
    variants: row.sizes.map((s) => ({
      sku: skuFor(row, s, opts.stamp),
      sizeValue: s,
      quantity: 1,
      priceOverride: null,
    })),
  }
  const productId = await adminProductService.save(values)

  let uploaded = 0
  const photoErrors: string[] = []
  for (let i = 0; i < photos.length; i++) {
    try {
      await adminProductService.addImage(
        productId,
        photos[i].file,
        VIEWS[uploaded] ?? 'detail',
        `${row.brand} ${row.name}, photo ${uploaded + 1}`,
        uploaded,
      )
      uploaded++
    } catch (e) {
      photoErrors.push(`Photo ${i + 1}: ${(e as Error).message}`)
    }
  }

  let published = false
  if (opts.publish && uploaded >= MIN_PRODUCT_IMAGES) {
    await adminProductService.setStatus(productId, 'active')
    published = true
  }
  return { productId, published, photosUploaded: uploaded, photoErrors }
}
