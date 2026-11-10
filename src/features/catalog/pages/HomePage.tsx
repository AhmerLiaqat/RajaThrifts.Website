import { CollectionsSection } from '@/features/home/sections/CollectionsSection'
import { CommunitySection } from '@/features/home/sections/CommunitySection'
import { HeroSection } from '@/features/home/sections/HeroSection'
import { LatestDropsSection } from '@/features/home/sections/LatestDropsSection'
import { ReviewsSection } from '@/features/home/sections/ReviewsSection'

/** Homepage: hero, shop by grade, latest drops, reviews and community. */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CollectionsSection />
      <LatestDropsSection />
      <ReviewsSection />
      <CommunitySection />
    </>
  )
}
