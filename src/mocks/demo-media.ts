/**
 * DEMO MEDIA. Not RajaThrifs inventory.
 *
 * Stock photography from Unsplash (https://unsplash.com/license), hot-linked
 * as Unsplash's guidelines require. It is used only to preview the design.
 * Replace with real product photos from Supabase Storage before launch.
 */

export const UNSPLASH_CREDIT_URL = 'https://unsplash.com'

/** Builds a responsive Unsplash CDN URL. */
export const unsplash = (photoId: string, width = 1200, height?: number) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&crop=entropy&q=80&w=${width}${
    height ? `&h=${height}` : ''
  }`

/** srcSet across common widths for <img>. */
export const unsplashSrcSet = (photoId: string, widths = [480, 800, 1200, 1600]) =>
  widths.map((w) => `${unsplash(photoId, w)} ${w}w`).join(', ')

export interface DemoPhoto {
  id: string
  alt: string
}

export const HERO_PHOTO: DemoPhoto = {
  id: '1518002171953-a080ee817e1f',
  alt: 'Two grey sneakers lit by a single light in a dark room',
}

/** Homepage hero showcase: a blue runner on violet, in tune with the night-navy theme. */
export const HERO_SHOWCASE_PHOTO: DemoPhoto = {
  id: '1515955656352-a1fa3ffcd111',
  alt: 'Blue air-cushion runner on a violet background',
}

export const STORY_PHOTO: DemoPhoto = {
  id: '1549298916-b41d501d3772',
  alt: 'Tan leather sneaker resting on golden fabric',
}

export const EDITORIAL_PHOTOS: Array<DemoPhoto & { caption: string }> = [
  { id: '1529810313688-44ea1c2d81d3', alt: 'Olive boots splashing through a puddle', caption: 'Rain check' },
  { id: '1556906781-9a412961c28c', alt: 'Sneakers on feet against city glass', caption: 'Concrete' },
  { id: '1588361861040-ac9b1018f6d5', alt: 'Tonal grey low-tops on black', caption: 'Monochrome' },
  { id: '1460353581641-37baddab0fa2', alt: 'White sneaker on a street kerb', caption: 'Street level' },
  { id: '1600269452121-4f2416e55c28', alt: 'White leather low-top close up', caption: 'Clean slate' },
]

export const INSTAGRAM_PHOTOS: DemoPhoto[] = [
  { id: '1515955656352-a1fa3ffcd111', alt: 'Blue air-cushion runner on violet background' },
  { id: '1491553895911-0055eca6402d', alt: 'Black runner floating on white' },
  { id: '1603808033192-082d6919d3e1', alt: 'White sneakers on an orange set' },
  { id: '1543508282-6319a3e2621f', alt: 'Black leather low-top on a white pedestal' },
  { id: '1556906781-9a412961c28c', alt: 'Sneakers on feet in the city' },
  { id: '1562183241-b937e95585b6', alt: 'Grey knit sneaker tossed mid-air' },
]

/** Banner photography for the collection pages (demo). */
export const COLLECTION_PHOTOS: Record<'PREMIUM' | 'A CATEGORY' | 'B CATEGORY', DemoPhoto> = {
  PREMIUM: { id: '1586525198428-225f6f12cff5', alt: 'High-top sneakers worn on concrete' },
  'A CATEGORY': { id: '1514989940723-e8e51635b782', alt: 'Colourful runners on a street kerb' },
  'B CATEGORY': { id: '1525966222134-fcfa99b8ae77', alt: 'Burgundy canvas skate shoe on yellow' },
}
