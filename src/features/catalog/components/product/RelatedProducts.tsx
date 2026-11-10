import { Reveal } from '@/components/motion/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { Product } from '@/types/product'
import { useRelatedProducts } from '../../hooks/useProducts'
import { ProductCard } from '../ProductCard'
import { ProductGridSkeleton } from '../ProductGrid'

export function RelatedProducts({ product, isDemo }: { product: Product; isDemo?: boolean }) {
  const related = useRelatedProducts(product, 4)
  if (related.data && related.data.length === 0) return null

  return (
    <section aria-labelledby="related-heading" className="border-t border-line bg-surface-sunken py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div id="related-heading">
          <SectionHeading
            eyebrow="Keep looking"
            title="You may"
            outline="also like"
            description={`More pairs from ${product.collection} and ${product.brand}, close to this price.`}
          />
        </div>
        <div className="mt-8">
          {!related.data ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.data.map((p, i) => (
                <li key={p.id}>
                  <Reveal delay={i * 0.06}>
                    <ProductCard product={p} isDemo={isDemo} />
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
