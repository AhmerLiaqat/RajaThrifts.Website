/**
 * DEMO CATALOG. Sample listings for previewing the storefront.
 * These are NOT real RajaThrifs inventory, prices, stock levels or defects.
 *
 * Products use the full `Product` type, so the demo product service can run the
 * exact same filter/sort/facet logic the Supabase service uses.
 *
 * Photography note: each demo pair has ONE real stock photo (labelled with the
 * angle it actually shows) plus close-up crops of that same photo. Views we do not
 * have (e.g. sole, back) are left missing and shown as "not photographed", never
 * substituted with a different shoe.
 */
import type { Collection } from '@/constants/collections'
import type {
  ConditionGrade,
  Gender,
  Product,
  ProductDefect,
  ProductImage,
  ProductImageView,
  ProductSummary,
} from '@/types/product'
import { toSummary } from '@/services/products/product.query'
import { unsplash } from './demo-media'

export const IS_DEMO_CATALOG = true

interface Seed {
  photo: string
  /** The angle the stock photo actually shows. */
  view: ProductImageView
  name: string
  brand: string
  model?: string
  collection: Collection
  /** Category slug (see DEMO_CATEGORIES). Defaults to sneakers. */
  type?: keyof typeof DEMO_CATEGORIES
  gender?: Gender
  color: string
  origin: string
  condition: ConditionGrade
  /** PKR (whole rupees). */
  price: number
  compareAt?: number
  /** [EU size, quantity]. Quantity 0 = that size has sold. */
  sizes: Array<[string, number]>
  defects?: ProductDefect[]
  notes: string
  /** Listed this many days before DEMO_TODAY. */
  daysAgo: number
  /** Close-up focal points [x, y] within the photo (0–1). */
  details?: Array<[number, number]>
}

/** Mirrors supabase/seed.sql categories. */
const DEMO_CATEGORIES = {
  sneakers: 'Sneakers',
  running: 'Running',
  basketball: 'Basketball',
  boots: 'Boots',
} as const

const DEMO_TODAY = Date.parse('2026-11-08T10:00:00Z')
const DAY = 86_400_000
const CODE: Record<Collection, string> = { PREMIUM: 'PRM', 'A CATEGORY': 'ACA', 'B CATEGORY': 'BCA' }

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** imgix focal-point crop of the same photo, used for honest detail close-ups. */
const focal = (photo: string, x: number, y: number, zoom: number) =>
  `${unsplash(photo, 1200, 1500)}&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}`

let seq = 0
const build = (s: Seed): Product => {
  seq += 1
  const slug = `${slugify(`${s.brand} ${s.name}`)}-demo`
  const id = `demo-${String(seq).padStart(3, '0')}`
  const createdAt = new Date(DEMO_TODAY - s.daysAgo * DAY).toISOString()
  const label = `${s.brand} ${s.name}`

  const images: ProductImage[] = [
    {
      id: `${id}-img-0`,
      storagePath: '',
      url: unsplash(s.photo, 1200, 1500),
      alt: `${label}, ${s.view.replace('_', '-')} view (demo photo)`,
      position: 0,
      view: s.view,
    },
    ...(
      s.details ?? [
        [0.3, 0.55],
        [0.7, 0.5],
      ]
    ).map(([x, y], i): ProductImage => ({
      id: `${id}-img-${i + 1}`,
      storagePath: '',
      url: focal(s.photo, x, y, 2.2),
      alt: `${label}, close-up detail (demo photo)`,
      position: i + 1,
      view: 'detail',
    })),
  ]

  const variants = s.sizes.map(([size, quantity]) => ({
    id: `${id}-eu${size}`,
    productId: id,
    sku: `RT-${CODE[s.collection]}-${String(seq).padStart(3, '0')}-${size}`,
    size: { system: 'EU' as const, value: size },
    quantity,
    priceOverride: null,
    createdAt,
    updatedAt: createdAt,
  }))

  return {
    id,
    slug,
    name: s.name,
    brand: s.brand,
    brandId: null,
    model: s.model ?? null,
    description: `${label} in ${s.color.toLowerCase()}. Imported from ${s.origin}, inspected and graded ${s.collection} by the RajaThrifs team.`,
    collection: s.collection,
    category: {
      id: `demo-cat-${s.type ?? 'sneakers'}`,
      slug: s.type ?? 'sneakers',
      name: DEMO_CATEGORIES[s.type ?? 'sneakers'],
    },
    gender: s.gender ?? 'unisex',
    condition: s.condition,
    conditionNotes: s.notes,
    defects: s.defects ?? [],
    originCountry: s.origin,
    color: s.color,
    price: s.price * 100,
    compareAtPrice: s.compareAt ? s.compareAt * 100 : null,
    status: variants.some((v) => v.quantity > 0) ? 'active' : 'sold_out',
    isFeatured: s.collection === 'PREMIUM',
    images,
    variants,
    createdAt,
    updatedAt: createdAt,
  }
}

// ── PREMIUM ────────────────────────────────────────────────────────────────
const PREMIUM_SEEDS: Seed[] = [
  {
    photo: '1552346154-21d32810aba3',
    view: 'side',
    name: 'Jordan 1 Low, Black / Red',
    brand: 'Nike',
    model: 'Air Jordan 1 Low',
    collection: 'PREMIUM',
    color: 'Black / Red / White',
    origin: 'United States',
    condition: 'like_new',
    price: 24500,
    compareAt: 32000,
    sizes: [
      ['42', 1],
      ['43', 1],
    ],
    daysAgo: 21,
    notes: 'Worn a handful of times. Leather is crisp with no creasing on the toe box; soles are near-new.',
    defects: [
      { area: 'Right heel tab', severity: 'minor', description: 'Faint scuff, only visible up close.' },
    ],
  },
  {
    photo: '1586525198428-225f6f12cff5',
    view: 'on_foot',
    name: 'Jordan 1 High, Obsidian',
    brand: 'Nike',
    model: 'Air Jordan 1 High OG',
    collection: 'PREMIUM',
    color: 'Obsidian / University Blue',
    origin: 'United Kingdom',
    condition: 'like_new',
    price: 28900,
    compareAt: 38000,
    sizes: [['44', 1]],
    daysAgo: 18,
    details: [
      [0.45, 0.65],
      [0.75, 0.7],
    ],
    notes: 'Exceptional pair. Original laces included, insoles clean, no heel drag.',
  },
  {
    photo: '1584735175315-9d5df23860e6',
    view: 'side',
    name: 'Dunk High, Pastel Patchwork',
    brand: 'Nike',
    model: 'Dunk High',
    collection: 'PREMIUM',
    color: 'Pastel multi',
    origin: 'Japan',
    condition: 'like_new',
    price: 22500,
    compareAt: 29000,
    sizes: [
      ['41', 1],
      ['42', 0],
    ],
    daysAgo: 30,
    details: [
      [0.5, 0.7],
      [0.3, 0.8],
    ],
    notes: 'Suede panels brushed and restored. Gum-tone sole shows very light wear at the heel.',
    defects: [{ area: 'Outsole heel', severity: 'minor', description: 'Light even wear on both heels.' }],
  },
  {
    photo: '1575537302964-96cd47c06b1b',
    view: 'side',
    name: 'Jordan 12 Retro, Gym Red',
    brand: 'Nike',
    model: 'Air Jordan 12 Retro',
    collection: 'PREMIUM',
    type: 'sneakers',
    color: 'Gym Red',
    origin: 'United States',
    condition: 'excellent',
    price: 26500,
    compareAt: 35000,
    sizes: [['43', 0]],
    daysAgo: 40,
    notes: 'Sold. Kept online so customers can see what a PREMIUM grade looks like.',
    defects: [
      { area: 'Left toe box', severity: 'minor', description: 'Shallow crease from normal wear.' },
      { area: 'Midsole', severity: 'minor', description: 'Small paint chip near the shank.' },
    ],
  },
  {
    photo: '1597045566677-8cf032ed6634',
    view: 'side',
    name: 'Jordan 1 Mid, White / Gym Red',
    brand: 'Nike',
    model: 'Air Jordan 1 Mid',
    collection: 'PREMIUM',
    color: 'White / Gym Red / Black',
    origin: 'Germany',
    condition: 'like_new',
    price: 21900,
    compareAt: 28000,
    sizes: [['43', 1]],
    daysAgo: 2,
    notes: 'Barely worn. Toe box has no creasing and the leather still has its factory sheen.',
  },
  {
    photo: '1595950653106-6c9ebd614d3a',
    view: 'side',
    name: 'Air Force 1 Shadow, Pastel',
    brand: 'Nike',
    model: 'Air Force 1 Shadow',
    collection: 'PREMIUM',
    gender: 'women',
    color: 'Pastel multi',
    origin: 'South Korea',
    condition: 'like_new',
    price: 19500,
    compareAt: 26000,
    sizes: [
      ['38', 1],
      ['39', 1],
    ],
    daysAgo: 4,
    notes: 'Layered overlays intact with no lifting. Clean white midsole.',
  },
]

// ── A CATEGORY ─────────────────────────────────────────────────────────────
const A_SEEDS: Seed[] = [
  {
    photo: '1542291026-7eec264c27ff',
    view: 'side',
    name: 'Free RN Flyknit, Crimson',
    brand: 'Nike',
    model: 'Free RN Flyknit',
    collection: 'A CATEGORY',
    type: 'running',
    color: 'Crimson',
    origin: 'United States',
    condition: 'excellent',
    price: 11500,
    compareAt: 19000,
    sizes: [
      ['41', 1],
      ['42', 1],
      ['43', 1],
    ],
    daysAgo: 25,
    notes: 'Knit upper is clean and tight. Flexible sole has light, even wear.',
    defects: [
      { area: 'Outsole forefoot', severity: 'minor', description: 'Normal tread wear, plenty of life left.' },
    ],
  },
  {
    photo: '1579338559194-a162d19bf842',
    view: 'side',
    name: 'Air Force 1 React, White / Blue',
    brand: 'Nike',
    model: 'Air Force 1 React',
    collection: 'A CATEGORY',
    color: 'White / Blue / Red',
    origin: 'Canada',
    condition: 'excellent',
    price: 12900,
    compareAt: 21000,
    sizes: [['42', 1]],
    daysAgo: 16,
    notes: 'Deep-cleaned. Midsole whitened; small marks remain on the toe.',
    defects: [{ area: 'Toe cap', severity: 'minor', description: 'Two faint marks, visible in close-up.' }],
  },
  {
    photo: '1551107696-a4b0c5a0d9a2',
    view: 'side',
    name: 'X-90, Rose / Grey',
    brand: 'New Balance',
    model: 'X-90',
    collection: 'A CATEGORY',
    gender: 'women',
    color: 'Rose / Grey',
    origin: 'United Kingdom',
    condition: 'excellent',
    price: 10500,
    compareAt: 17500,
    sizes: [
      ['38', 1],
      ['39', 0],
    ],
    daysAgo: 12,
    notes: 'Suede and mesh in great shape. Light creasing at the flex point.',
    defects: [{ area: 'Vamp', severity: 'minor', description: 'Light flex creasing.' }],
  },
  {
    photo: '1539185441755-769473a23570',
    view: 'side',
    name: '247, Olive',
    brand: 'New Balance',
    model: '247',
    collection: 'A CATEGORY',
    gender: 'men',
    color: 'Olive',
    origin: 'Germany',
    condition: 'good',
    price: 9900,
    compareAt: 16000,
    sizes: [
      ['44', 1],
      ['45', 1],
    ],
    daysAgo: 33,
    notes: 'Comfortable everyday pair. Upper is clean; midsole has a few marks.',
    defects: [
      { area: 'Midsole', severity: 'moderate', description: 'Scuffs along the lateral side.' },
      { area: 'Insole', severity: 'minor', description: 'Logo print partly faded.' },
    ],
  },
  {
    photo: '1465453869711-7e174808ace9',
    view: 'front',
    name: '574, Cloud / Coral',
    brand: 'New Balance',
    model: '574',
    collection: 'A CATEGORY',
    color: 'Cloud / Coral',
    origin: 'United States',
    condition: 'excellent',
    price: 10900,
    compareAt: 18000,
    sizes: [['40', 1]],
    daysAgo: 9,
    notes: 'Clean pair with sharp coral accents. Very light wear on the outsole.',
  },
  {
    photo: '1600185365483-26d7a4cc7519',
    view: 'side',
    name: 'Air Max 1, White / Orange',
    brand: 'Nike',
    model: 'Air Max 1',
    collection: 'A CATEGORY',
    color: 'White / Orange',
    origin: 'Netherlands',
    condition: 'excellent',
    price: 13500,
    compareAt: 22000,
    sizes: [
      ['42', 0],
      ['43', 0],
    ],
    daysAgo: 45,
    notes: 'Sold. Air units were clear and firm.',
  },
  {
    photo: '1514989940723-e8e51635b782',
    view: 'on_foot',
    name: 'Air Max 90, Sunset',
    brand: 'Nike',
    model: 'Air Max 90',
    collection: 'A CATEGORY',
    color: 'Orange / Yellow / Blue',
    origin: 'Japan',
    condition: 'excellent',
    price: 12500,
    compareAt: 20000,
    sizes: [['42', 1]],
    daysAgo: 1,
    details: [
      [0.45, 0.65],
      [0.7, 0.7],
    ],
    notes: 'Bold colourway in great condition. Suede panels freshly brushed.',
    defects: [{ area: 'Heel counter', severity: 'minor', description: 'Small scuff on the inner heel.' }],
  },
  {
    photo: '1604671801908-6f0c6a092c05',
    view: 'side',
    name: 'Knit Runner, Iridescent',
    brand: 'Adidas',
    collection: 'A CATEGORY',
    type: 'running',
    color: 'Iridescent multi',
    origin: 'United States',
    condition: 'excellent',
    price: 13900,
    compareAt: 24000,
    sizes: [['44', 1]],
    daysAgo: 3,
    notes: 'Reflective knit is intact with no snags. Boost-style midsole is clean.',
  },
  {
    photo: '1622760807800-66cf1466fc08',
    view: 'front',
    name: 'Court Low, Sail',
    brand: 'Nike',
    collection: 'A CATEGORY',
    color: 'Sail / Cream',
    origin: 'France',
    condition: 'excellent',
    price: 9500,
    compareAt: 15000,
    sizes: [
      ['40', 1],
      ['41', 1],
    ],
    daysAgo: 5,
    notes: 'Minimal wear. Cream leather cleaned and conditioned.',
  },
]

// ── B CATEGORY ─────────────────────────────────────────────────────────────
const B_SEEDS: Seed[] = [
  {
    photo: '1525966222134-fcfa99b8ae77',
    view: 'side',
    name: 'Old Skool, Burgundy',
    brand: 'Vans',
    model: 'Old Skool',
    collection: 'B CATEGORY',
    color: 'Burgundy / White',
    origin: 'United States',
    condition: 'good',
    price: 5900,
    sizes: [
      ['41', 1],
      ['42', 1],
    ],
    daysAgo: 20,
    notes: 'Broken-in canvas, comfortable from day one. Clear signs of wear.',
    defects: [
      {
        area: 'Toe cap',
        severity: 'moderate',
        description: 'Rubber toe cap has scuffing and light yellowing.',
      },
      { area: 'Laces', severity: 'minor', description: 'Laces slightly frayed at the tips.' },
    ],
  },
  {
    photo: '1607522370275-f14206abe5d3',
    view: 'side',
    name: 'Chuck Taylor Hi, Red',
    brand: 'Converse',
    model: 'Chuck Taylor All Star',
    collection: 'B CATEGORY',
    color: 'Red',
    origin: 'United Kingdom',
    condition: 'good',
    price: 4900,
    sizes: [['40', 1]],
    daysAgo: 14,
    notes: 'Classic canvas with honest wear. Washed and deodorised.',
    defects: [
      { area: 'Sidewall', severity: 'moderate', description: 'Grey staining on the rubber sidewall.' },
    ],
  },
  {
    photo: '1621665421558-831f91fd0500',
    view: 'top',
    name: 'Chuck 70 Play, Cream',
    brand: 'Converse',
    model: 'Chuck 70',
    collection: 'B CATEGORY',
    color: 'Cream',
    origin: 'Japan',
    condition: 'good',
    price: 6500,
    sizes: [
      ['39', 1],
      ['41', 1],
    ],
    daysAgo: 10,
    details: [
      [0.7, 0.35],
      [0.35, 0.6],
    ],
    notes: 'Heavier canvas holds up well. Off-white tone with light marks.',
    defects: [{ area: 'Toe cap', severity: 'minor', description: 'Faint marks on both toe caps.' }],
  },
  {
    photo: '1608231387042-66d1773070a5',
    view: 'side',
    name: 'Court Classic, White',
    brand: 'Puma',
    collection: 'B CATEGORY',
    color: 'White',
    origin: 'Germany',
    condition: 'fair',
    price: 4500,
    sizes: [['43', 1]],
    daysAgo: 28,
    notes: 'Budget pair for daily use. Visible creasing and sole wear, priced to match.',
    defects: [
      { area: 'Toe box', severity: 'notable', description: 'Deep creasing across both toe boxes.' },
      {
        area: 'Outsole heel',
        severity: 'moderate',
        description: 'Uneven heel wear, more on the outer edge.',
      },
    ],
  },
  {
    photo: '1512374382149-233c42b6a83b',
    view: 'top',
    name: 'Air Force 1 High, Triple White',
    brand: 'Nike',
    model: 'Air Force 1 High',
    collection: 'B CATEGORY',
    color: 'White',
    origin: 'United States',
    condition: 'good',
    price: 6900,
    sizes: [['44', 0]],
    daysAgo: 38,
    notes: 'Sold.',
    defects: [{ area: 'Ankle strap', severity: 'moderate', description: 'Velcro strap weakened.' }],
  },
  {
    photo: '1520256862855-398228c41684',
    view: 'side',
    name: 'Prophere, Teal / Pink',
    brand: 'Adidas',
    model: 'Prophere',
    collection: 'B CATEGORY',
    color: 'Teal / Pink',
    origin: 'United Kingdom',
    condition: 'good',
    price: 6900,
    sizes: [['42', 1]],
    daysAgo: 6,
    notes: 'Chunky midsole still springy. Upper has some fading.',
    defects: [{ area: 'Upper', severity: 'moderate', description: 'Colour fading on the heel overlay.' }],
  },
  {
    photo: '1605348532760-6753d2c43329',
    view: 'side',
    name: 'Court Hoop Low, Black / White',
    brand: 'Nike',
    collection: 'B CATEGORY',
    color: 'Black / White',
    origin: 'Canada',
    condition: 'good',
    price: 7500,
    sizes: [
      ['43', 1],
      ['44', 1],
    ],
    daysAgo: 7,
    notes: 'Supportive court shoe with good traction left.',
    defects: [
      {
        area: 'Outsole',
        severity: 'moderate',
        description: 'Traction pattern worn smooth under the forefoot.',
      },
    ],
  },
  {
    photo: '1606107557195-0e29a4b5b4aa',
    view: 'side',
    name: 'SuperRep Go, Volt',
    brand: 'Nike',
    model: 'SuperRep Go',
    collection: 'B CATEGORY',
    type: 'running',
    color: 'Volt / Black',
    origin: 'Australia',
    condition: 'fair',
    price: 5500,
    sizes: [['42', 1]],
    daysAgo: 8,
    notes: 'Training shoe with plenty of gym sessions left. Visible wear.',
    defects: [
      {
        area: 'Mesh upper',
        severity: 'notable',
        description: 'Small tear near the left little toe (about 4 mm).',
      },
      { area: 'Insole', severity: 'minor', description: 'Insole shows wear marks.' },
    ],
  },
]

const ALL = [...PREMIUM_SEEDS, ...A_SEEDS, ...B_SEEDS].map(build)

/** Full demo catalog, used by the demo product service. */
export const DEMO_PRODUCTS: Product[] = ALL

// ── Curated lists for the homepage (summaries) ─────────────────────────────
const bySlugPrefix = (prefix: string) => ALL.find((p) => p.slug.startsWith(prefix))!
const summaries = (products: Product[]) => products.map(toSummary)
const NEW_CUTOFF_DAYS = 10
const isNew = (p: Product) => DEMO_TODAY - Date.parse(p.createdAt) <= NEW_CUTOFF_DAYS * DAY

export const DEMO_PREMIUM: ProductSummary[] = summaries(
  ALL.filter((p) => p.collection === 'PREMIUM' && !isNew(p)),
)
export const DEMO_A_CATEGORY: ProductSummary[] = summaries(
  ALL.filter((p) => p.collection === 'A CATEGORY' && !isNew(p)),
)
export const DEMO_B_CATEGORY: ProductSummary[] = summaries(
  ALL.filter((p) => p.collection === 'B CATEGORY' && !isNew(p)),
)
export const DEMO_NEW_ARRIVALS: ProductSummary[] = summaries(
  ALL.filter(isNew).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
)

/** Sample ranking for the Best Sellers section, not sales data. */
export const DEMO_BEST_SELLERS: ProductSummary[] = summaries([
  bySlugPrefix('nike-jordan-1-low'),
  bySlugPrefix('new-balance-574'),
  bySlugPrefix('vans-old-skool'),
  bySlugPrefix('nike-dunk-high'),
  bySlugPrefix('nike-free-rn'),
])
