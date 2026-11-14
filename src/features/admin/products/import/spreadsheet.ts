import type { Collection } from '@/constants/collections'
import { exportXlsx } from '@/lib/export'
import type { ConditionGrade, Gender } from '@/types/product'

/**
 * Bulk-import spreadsheet: one row per pair. Column headers are matched loosely
 * (case, spaces and brackets are ignored), so small edits to the template still work.
 */
export const TEMPLATE_COLUMNS = [
  { key: 'code', header: 'Code', hint: 'Folder / photo name, e.g. 01' },
  { key: 'brand', header: 'Brand', hint: 'Nike, Adidas…' },
  { key: 'name', header: 'Name', hint: 'Air Max 90, White / Red' },
  { key: 'size', header: 'EU size', hint: 'Required. 42 (or 42, 43 for two sizes)' },
  { key: 'ukSize', header: 'UK size', hint: 'Required. 8 (or 8, 9, in the same order as the EU sizes)' },
  { key: 'usSize', header: 'US size', hint: 'Required. 9 (or 9, 10, in the same order as the EU sizes)' },
  { key: 'cmSize', header: 'Size (cm)', hint: 'Optional. 26.5 (or 26, 26.5, in the same order as the EU sizes)' },
  { key: 'grade', header: 'Grade', hint: 'Premium / A / B' },
  { key: 'condition', header: 'Condition', hint: 'Like new / Excellent / Good / Fair' },
  { key: 'price', header: 'Price', hint: 'Selling price in PKR' },
  { key: 'originalPrice', header: 'Original price', hint: 'Optional retail price' },
  { key: 'costPrice', header: 'Cost price', hint: 'Optional, staff only' },
  { key: 'colour', header: 'Colour', hint: 'Optional' },
  { key: 'gender', header: 'Gender', hint: 'Optional: Men / Women / Unisex / Kids' },
  { key: 'model', header: 'Model', hint: 'Optional, e.g. Air Max 90' },
  { key: 'description', header: 'Description', hint: 'Optional' },
  { key: 'notes', header: 'Condition notes', hint: 'Optional: flaws, scuffs…' },
] as const

type Key = (typeof TEMPLATE_COLUMNS)[number]['key']

export interface ImportRow {
  /** Spreadsheet row number (1-based, header = 1). */
  line: number
  code: string
  brand: string
  name: string
  /** EU sizes. */
  sizes: string[]
  /** UK sizes, same order as `sizes`. */
  ukSizes: string[]
  /** US sizes, same order as `sizes`. */
  usSizes: string[]
  /** Optional lengths in cm, same order as `sizes` (empty when not given). */
  cmSizes: string[]
  collection: Collection | null
  condition: ConditionGrade | null
  gender: Gender
  price: number | null
  originalPrice: number | null
  costPrice: number | null
  colour: string
  model: string
  description: string
  notes: string
  errors: string[]
  warnings: string[]
}

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '')

/** Like norm, but keeps text in brackets, so "Size (UK)" and "Size (EU)" stay different. */
const normFull = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const headerKey = (c: unknown): Key | undefined => HEADER_ALIASES[normFull(c)] ?? HEADER_ALIASES[norm(c)]

const HEADER_ALIASES: Record<string, Key> = {
  code: 'code', folder: 'code', id: 'code', no: 'code', number: 'code', sr: 'code', srno: 'code',
  brand: 'brand',
  name: 'name', title: 'name', shoe: 'name', product: 'name', productname: 'name',
  size: 'size', sizes: 'size', sizeeu: 'size', eu: 'size', eusize: 'size', eusizes: 'size',
  uksize: 'ukSize', sizeuk: 'ukSize', uk: 'ukSize', uksizes: 'ukSize',
  ussize: 'usSize', sizeus: 'usSize', us: 'usSize', ussizes: 'usSize',
  sizecm: 'cmSize', cmsize: 'cmSize', cm: 'cmSize', length: 'cmSize', lengthcm: 'cmSize', footlength: 'cmSize', insole: 'cmSize', insolecm: 'cmSize',
  grade: 'grade', collection: 'grade', category: 'grade', tier: 'grade',
  condition: 'condition',
  price: 'price', sellingprice: 'price', saleprice: 'price',
  originalprice: 'originalPrice', retailprice: 'originalPrice', mrp: 'originalPrice', compareatprice: 'originalPrice',
  costprice: 'costPrice', cost: 'costPrice', purchaseprice: 'costPrice',
  colour: 'colour', color: 'colour',
  gender: 'gender',
  model: 'model',
  description: 'description', details: 'description',
  conditionnotes: 'notes', notes: 'notes', flaws: 'notes', defects: 'notes',
}

export const normalizeCode = (s: unknown) => {
  const t = String(s ?? '').trim().toLowerCase()
  return /^\d+$/.test(t) ? String(Number(t)) : t.replace(/\s+/g, ' ')
}

function parseGrade(v: string): Collection | null {
  const t = norm(v)
  if (!t) return null
  if (t.startsWith('prem') || t === 'p' || t === 'prm') return 'PREMIUM'
  if (t === 'a' || t.startsWith('acat') || t === 'aca' || t === 'agrade') return 'A CATEGORY'
  if (t === 'b' || t.startsWith('bcat') || t === 'bca' || t === 'bgrade') return 'B CATEGORY'
  return null
}

function parseCondition(v: string): ConditionGrade | null {
  const t = norm(v)
  if (!t) return null
  if (t.includes('new') || t === '10') return 'like_new'
  if (t.startsWith('exc') || t === '9') return 'excellent'
  if (t.startsWith('good') || t === '8' || t === '7') return 'good'
  if (t.startsWith('fair') || t.startsWith('used') || t === '6' || t === '5') return 'fair'
  return null
}

function parseGender(v: string): Gender {
  const t = norm(v)
  if (['men', 'man', 'male', 'm', 'mens', 'gents'].includes(t)) return 'men'
  if (['women', 'woman', 'female', 'f', 'w', 'womens', 'ladies'].includes(t)) return 'women'
  if (['kid', 'kids', 'child', 'children', 'junior'].includes(t)) return 'kids'
  return 'unisex'
}

function parseMoney(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const t = String(v ?? '').replace(/rs\.?|pkr|,|\s/gi, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

function parseSizes(v: unknown): string[] {
  return String(v ?? '')
    .replace(/eu|uk|us|cm/gi, '')
    .split(/[,/;|&]+|\s+and\s+/i)
    .map((s) => s.trim().replace(/\s+/g, ''))
    .filter(Boolean)
}

/** Minimal CSV reader (quotes, commas and new lines inside quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  const t = text.replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',' || c === ';' || c === '\t') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

async function readGrid(file: File): Promise<unknown[][]> {
  if (/\.csv$|\.txt$/i.test(file.name) || file.type === 'text/csv') return parseCsv(await file.text())
  const { readSheet } = await import('read-excel-file/browser')
  return (await readSheet(file)) as unknown[][]
}

/** Reads the filled template (.xlsx or .csv) into validated rows. */
export async function readImportSheet(file: File): Promise<ImportRow[]> {
  const grid = await readGrid(file)
  // The header is the first row that names at least three known columns.
  const headerIndex = grid.findIndex((r) => r.filter((c) => headerKey(c)).length >= 3)
  if (headerIndex < 0)
    throw new Error('Could not find the header row. Use the template: Code, Brand, Name, EU size, UK size, US size, Grade, Condition, Price…')
  const map = new Map<number, Key>()
  grid[headerIndex].forEach((c, i) => {
    const k = headerKey(c)
    if (k && ![...map.values()].includes(k)) map.set(i, k)
  })

  const rows: ImportRow[] = []
  for (let r = headerIndex + 1; r < grid.length; r++) {
    const cells = grid[r]
    const get = (k: Key): unknown => {
      for (const [i, key] of map) if (key === k) return cells[i]
      return undefined
    }
    const str = (k: Key) => String(get(k) ?? '').trim()
    if (!cells.some((c) => String(c ?? '').trim())) continue
    // Skip the template's example / hint rows.
    if (str('code').toLowerCase().startsWith('folder') || str('name').toLowerCase().startsWith('e.g')) continue

    const row: ImportRow = {
      line: r + 1,
      code: normalizeCode(get('code')),
      brand: str('brand'),
      name: str('name'),
      sizes: parseSizes(get('size')),
      ukSizes: parseSizes(get('ukSize')),
      usSizes: parseSizes(get('usSize')),
      cmSizes: parseSizes(get('cmSize')),
      collection: parseGrade(str('grade')),
      condition: parseCondition(str('condition')),
      gender: parseGender(str('gender')),
      price: parseMoney(get('price')),
      originalPrice: parseMoney(get('originalPrice')),
      costPrice: parseMoney(get('costPrice')),
      colour: str('colour'),
      model: str('model'),
      description: str('description'),
      notes: str('notes'),
      errors: [],
      warnings: [],
    }
    if (!row.code) row.errors.push('Code is missing (it links the row to its photos).')
    if (!row.brand) row.errors.push('Brand is missing.')
    if (row.name.length < 2) row.errors.push('Name is missing.')
    // EU, UK and US sizes are all required, one of each per pair, in the same order.
    for (const [list, system] of [
      [row.sizes, 'EU'],
      [row.ukSizes, 'UK'],
      [row.usSizes, 'US'],
    ] as const) {
      if (!list.length) row.errors.push(`${system} size is missing.`)
      for (const s of list) if (!/^\d{1,2}(\.5)?$/.test(s)) row.errors.push(`${system} size "${s}" is not valid (e.g. 8 or 8.5).`)
    }
    if (
      row.sizes.length &&
      row.ukSizes.length &&
      row.usSizes.length &&
      (row.ukSizes.length !== row.sizes.length || row.usSizes.length !== row.sizes.length)
    )
      row.errors.push(
        `Give one UK and one US size for each EU size (${row.sizes.length} EU, ${row.ukSizes.length} UK, ${row.usSizes.length} US).`,
      )
    // cm is optional, but when given it needs one value per EU size.
    if (row.cmSizes.length) {
      for (const c of row.cmSizes)
        if (!/^\d{1,2}(\.\d)?$/.test(c) || Number(c) < 10 || Number(c) > 40)
          row.errors.push(`Size in cm "${c}" is not valid (e.g. 26.5).`)
      if (row.sizes.length && row.cmSizes.length !== row.sizes.length)
        row.errors.push(`Give one cm size for each EU size, or leave cm empty (${row.sizes.length} EU, ${row.cmSizes.length} cm).`)
    }
    if (!row.collection) row.errors.push(`Grade "${str('grade')}" is not Premium, A or B.`)
    if (!row.condition) row.errors.push(`Condition "${str('condition')}" is not Like new, Excellent, Good or Fair.`)
    if (row.price == null || Number.isNaN(row.price) || row.price <= 0) row.errors.push('Price is missing or not a number.')
    if (row.originalPrice != null && (Number.isNaN(row.originalPrice) || (row.price && row.originalPrice < row.price))) {
      row.warnings.push('Original price is lower than the price, so it was left out.')
      row.originalPrice = null
    }
    if (row.costPrice != null && Number.isNaN(row.costPrice)) {
      row.warnings.push('Cost price is not a number, so it was left out.')
      row.costPrice = null
    }
    rows.push(row)
  }

  const seen = new Map<string, number>()
  for (const row of rows) {
    if (!row.code) continue
    if (seen.has(row.code)) row.errors.push(`Code ${row.code} is used twice (also on row ${seen.get(row.code)}).`)
    else seen.set(row.code, row.line)
  }
  return rows
}

/** Downloads the Excel template with an example row. */
export async function downloadTemplate() {
  type R = Record<Key, string | number>
  const example: R[] = [
    { code: '01', brand: 'Nike', name: 'Air Max 90, White / Red', size: '42', ukSize: '8', usSize: '9', cmSize: '26.5', grade: 'Premium', condition: 'Excellent', price: 18500, originalPrice: 32000, costPrice: '', colour: 'White / Red', gender: 'Men', model: 'Air Max 90', description: '', notes: 'Small scuff on left toe' },
    { code: '02', brand: 'Adidas', name: 'Samba OG, Black', size: '41', ukSize: '7', usSize: '8', cmSize: '', grade: 'A', condition: 'Good', price: 9500, originalPrice: '', costPrice: '', colour: 'Black', gender: 'Unisex', model: 'Samba OG', description: '', notes: '' },
  ]
  await exportXlsx('raja-thrifts-bulk-import-template', [
    {
      name: 'Products',
      columns: TEMPLATE_COLUMNS.map((c) => ({
        header: c.header,
        width: c.key === 'name' || c.key === 'description' || c.key === 'notes' ? 34 : 16,
        value: (r: unknown) => (r as R)[c.key],
        kind: (c.key === 'price' || c.key === 'originalPrice' || c.key === 'costPrice' ? 'number' : 'text') as 'number' | 'text',
      })),
      rows: example,
    },
    {
      name: 'How to fill',
      columns: [
        { header: 'Column', width: 18, value: (r: unknown) => (r as { a: string }).a },
        { header: 'What to write', width: 70, value: (r: unknown) => (r as { b: string }).b },
      ],
      rows: [
        ...TEMPLATE_COLUMNS.map((c) => ({ a: c.header, b: c.hint })),
        { a: 'Photos', b: 'Put each pair’s photos in a folder named with its Code (e.g. folder "01"), or name the files 01-1.jpg, 01-2.jpg… At least 3 photos per pair.' },
        { a: 'Example rows', b: 'Replace or delete the two example rows (01 and 02) before importing.' },
      ],
    },
  ])
}
