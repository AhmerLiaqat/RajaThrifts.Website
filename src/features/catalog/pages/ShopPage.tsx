import { useSeo } from '@/lib/seo/useSeo'
import { CatalogView } from '../components/CatalogView'

export default function ShopPage() {
  useSeo({
    title: 'Shop branded thrift sneakers',
    description:
      'Shop imported pre-owned Nike, Adidas, New Balance and more at thrift prices. Filter by size, brand and grade. Every pair hand-inspected, delivered across Pakistan.',
    path: '/shop',
  })
  return <CatalogView />
}
