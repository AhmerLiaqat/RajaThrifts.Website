import { useParams } from 'react-router-dom'
import { collectionFromSlug } from '@/constants/collections'
import { collectionSeo } from '@/lib/seo/copy'
import { useSeo } from '@/lib/seo/useSeo'
import NotFoundPage from '@/pages/NotFoundPage'
import { CatalogView } from '../components/CatalogView'

/** /collections/premium, /collections/a-category, /collections/b-category */
export default function CollectionPage() {
  const { collectionSlug } = useParams()
  const meta = collectionFromSlug(collectionSlug)
  useSeo(meta ? collectionSeo(meta.slug, window.location.origin) : null)
  if (!meta) return <NotFoundPage />
  // key: reset local UI state (drawer, search box) when switching collections.
  return <CatalogView key={meta.slug} meta={meta} />
}
