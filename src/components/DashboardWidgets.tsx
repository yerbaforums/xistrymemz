'use client'

import ProfileStrength from '@/components/ProfileStrength'
import TravelingModeBanner from '@/components/TravelingModeBanner'
import BoardsWidget from '@/components/BoardsWidget'

export default function DashboardWidgets() {
  return (
    <>
      <ProfileStrength />
      <TravelingModeBanner />
      <BoardsWidget />
    </>
  )
}
