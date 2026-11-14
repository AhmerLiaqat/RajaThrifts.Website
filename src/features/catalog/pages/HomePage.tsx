import { CollectionsSection } from '@/features/home/sections/CollectionsSection'
import { homeSeo } from '@/lib/seo/copy'
import { useSeo } from '@/lib/seo/useSeo'
import { HeroSection } from '@/features/home/sections/HeroSection'
import { HowItWorksSection } from '@/features/home/sections/HowItWorksSection'
import { LatestDropsSection } from '@/features/home/sections/LatestDropsSection'
import { ReviewsSection } from '@/features/home/sections/ReviewsSection'
import { SeoFaqSection } from '@/features/home/sections/SeoFaqSection'

/** Homepage: hero, shop by grade, latest drops, how it works and reviews. */
export default function HomePage() {
  useSeo(homeSeo(window.location.origin))
  return (
    <>
      <HeroSection />
      <CollectionsSection />
      <LatestDropsSection />
      <HowItWorksSection />
      <ReviewsSection />
      <SeoFaqSection />
    </>
  )
}
