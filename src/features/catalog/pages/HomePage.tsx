import { CollectionsSection } from '@/features/home/sections/CollectionsSection'
import { storeSchema } from '@/lib/seo/schema'
import { useSeo } from '@/lib/seo/useSeo'
import { HeroSection } from '@/features/home/sections/HeroSection'
import { HowItWorksSection } from '@/features/home/sections/HowItWorksSection'
import { LatestDropsSection } from '@/features/home/sections/LatestDropsSection'
import { ReviewsSection } from '@/features/home/sections/ReviewsSection'

/** Homepage: hero, shop by grade, latest drops, how it works and reviews. */
export default function HomePage() {
  useSeo({ path: '/', jsonLd: storeSchema(window.location.origin) })
  return (
    <>
      <HeroSection />
      <CollectionsSection />
      <LatestDropsSection />
      <HowItWorksSection />
      <ReviewsSection />
    </>
  )
}
