import { shopSeo } from '@/lib/seo/copy'
import { useSeo } from '@/lib/seo/useSeo'
import { CatalogView } from '../components/CatalogView'

export default function ShopPage() {
  useSeo(shopSeo(window.location.origin))
  return <CatalogView />
}
