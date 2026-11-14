import { CollectionsSection } from '@/features/home/sections/CollectionsSection'
import { HeroSection } from '@/features/home/sections/HeroSection'
import { HowItWorksSection } from '@/features/home/sections/HowItWorksSection'
import { LatestDropsSection } from '@/features/home/sections/LatestDropsSection'
import { ReviewsSection } from '@/features/home/sections/ReviewsSection'

/** Homepage: hero, shop by grade, latest drops, how it works and reviews. */
export default function HomePage() {
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
