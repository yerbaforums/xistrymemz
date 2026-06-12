'use client'

import ProfileStrength from '@/components/ProfileStrength'
import TravelingModeBanner from '@/components/TravelingModeBanner'
import BoardsWidget from '@/components/BoardsWidget'
import InviteWidget from '@/components/InviteWidget'
import SchoolProgressWidget from '@/components/SchoolProgressWidget'

export default function DashboardWidgets() {
  return (
    <>
      <ProfileStrength />
      <TravelingModeBanner />
      <InviteWidget />
      <BoardsWidget />
      <SchoolProgressWidget />
    </>
  )
}
