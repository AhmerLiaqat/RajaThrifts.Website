import { ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { PageLoader } from '@/components/feedback/PageLoader'
import { env } from '@/config/env'
import { productSchema } from '@/lib/seo/schema'
import { useSeo } from '@/lib/seo/useSeo'
import { COLLECTION_META } from '@/constants/collections'
import { CONDITION_META } from '@/constants/product'
import { ServiceError } from '@/services'
import NotFoundPage from '@/pages/NotFoundPage'
import { AccordionItem } from '../components/product/ProductDetails'
import { ProductGallery } from '../components/product/ProductGallery'
import { PurchasePanel } from '../components/product/PurchasePanel'
import { RelatedProducts } from '../components/product/RelatedProducts'
import { useProduct } from '../hooks/useProducts'

export default function ProductDetailPage() {
  const { productSlug } = useParams()
  const { data: product, isPending, error } = useProduct(productSlug)
  const isDemo = env.useDemoCatalog

  useSeo(
    product
      ? {
          title: `${product.brand} ${product.name}`,
          description: `${product.brand} ${product.name}, ${COLLECTION_META[product.collection].label}, ${CONDITION_META[product.condition].label.toLowerCase()} condition. Sizes: ${product.variants.map((v) => `EU ${v.size.value}`).join(', ')}. ${product.description}`,
          path: `/products/${product.slug}`,
          image: product.images[0]?.url,
          jsonLd: productSchema(product, window.location.origin),
        }
      : null,
  )

  if (isPending) return <PageLoader />
  if (error instanceof ServiceError && error.code === 'NOT_FOUND') return <NotFoundPage />
  if (error || !product) throw error ?? new Error('Product unavailable')

  const collection = COLLECTION_META[product.collection]
  const soldOut = !product.variants.some((v) => v.quantity > 0)

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6 lg:px-8 lg:pt-10">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 lg:mb-10">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            {[
              { to: paths.home, label: 'Home' },
              { to: paths.shop, label: 'Shop' },
              { to: paths.collection(collection.slug), label: collection.label },
            ].map((c) => (
              <li key={c.to} className="flex items-center gap-1.5">
                <Link to={c.to} className="hover:text-bone">
                  {c.label}
                </Link>
                <ChevronRight className="size-3" aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="truncate text-bone">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <div className="lg:sticky lg:top-[172px] lg:self-start">
            <ProductGallery
              images={product.images}
              productName={`${product.brand} ${product.name}`}
              isDemo={isDemo}
              soldOut={soldOut}
            />
          </div>

          <div>
            <PurchasePanel key={product.id} product={product} isDemo={isDemo} />

            <div className="mt-10 border-t border-bone/10">
              <AccordionItem title="Details" defaultOpen>
                <p>{product.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    ['Brand', product.brand],
                    ['Model', product.model],
                    ['Colour', product.color],
                    ['Category', product.category?.name],
                    [
                      'Fit',
                      product.gender === 'unisex'
                        ? 'Unisex'
                        : product.gender === 'men'
                          ? 'Men'
                          : product.gender === 'women'
                            ? 'Women'
                            : 'Kids',
                    ],
                    ['Grade', `${product.collection} · ${CONDITION_META[product.condition].label}`],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-ink-subtle">{k}</dt>
                        <dd className="text-bone/90">{v}</dd>
                      </div>
                    ))}
                </dl>
              </AccordionItem>
              <AccordionItem title="How we grade">
                <p>
                  Every pair is inspected by hand and placed into one collection.{' '}
                  <strong className="text-bone">PREMIUM</strong> is near-new,{' '}
                  <strong className="text-bone">A CATEGORY</strong> shows light wear and{' '}
                  <strong className="text-bone">B CATEGORY</strong> shows visible wear at the best prices. Any
                  flaw we find is listed under Defect disclosure, with a photo where possible.
                </p>
              </AccordionItem>
              <AccordionItem title="Size & fit">
                <p>
                  Each pair is listed with its EU, UK and US size, taken from the pair itself, and its length in cm where we measured it. Pre-loved shoes
                  may have slightly softened insoles. If you are between sizes, message us before ordering and
                  we will measure the insole for you.
                </p>
              </AccordionItem>
              <AccordionItem title="Delivery & returns">
                <p>
                  Delivery and return terms will be confirmed at checkout. Because each pair is one of a kind,
                  please review the photos and defect disclosure carefully before buying.
                </p>
              </AccordionItem>
            </div>
          </div>
        </div>
      </div>

      <RelatedProducts product={product} isDemo={isDemo} />
    </>
  )
}
