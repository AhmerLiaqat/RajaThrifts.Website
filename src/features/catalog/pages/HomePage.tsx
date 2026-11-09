import { BestSellersSection } from '@/features/home/sections/BestSellersSection'
import { CollectionsSection } from '@/features/home/sections/CollectionsSection'
import { CommunitySection } from '@/features/home/sections/CommunitySection'
import { GradingSection } from '@/features/home/sections/GradingSection'
import { HeroSection } from '@/features/home/sections/HeroSection'
import { LatestDropsSection } from '@/features/home/sections/LatestDropsSection'
import { LookbookSection } from '@/features/home/sections/LookbookSection'
import { MarqueeBand } from '@/features/home/sections/MarqueeBand'
import { ReviewsSection } from '@/features/home/sections/ReviewsSection'

/** Homepage: one continuous night-sky canvas; every section shares the glass + gold style. */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MarqueeBand />
      <CollectionsSection />
      <LatestDropsSection />
      <BestSellersSection />
      <GradingSection />
      <LookbookSection />
      <ReviewsSection />
      <CommunitySection />
    </>
  )
}
