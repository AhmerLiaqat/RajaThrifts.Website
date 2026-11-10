import { CollectionsSection } from '@/features/home/sections/CollectionsSection'
import { CommunitySection } from '@/features/home/sections/CommunitySection'
import { DealsSection } from '@/features/home/sections/DealsSection'
import { HeroSection } from '@/features/home/sections/HeroSection'
import { HowItWorksSection } from '@/features/home/sections/HowItWorksSection'
import { LatestDropsSection } from '@/features/home/sections/LatestDropsSection'
import { ReviewsSection } from '@/features/home/sections/ReviewsSection'

/** Homepage: hero, shop by grade, latest drops, reviews and community. */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CollectionsSection />
      <LatestDropsSection />
      <DealsSection />
      <HowItWorksSection />
      <ReviewsSection />
      <CommunitySection />
    </>
  )
}
