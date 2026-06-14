'use client'

import ProfileStrength from '@/components/ProfileStrength'
import TravelingModeBanner from '@/components/TravelingModeBanner'
import BoardsWidget from '@/components/BoardsWidget'
import InviteWidget from '@/components/InviteWidget'
import SchoolProgressWidget from '@/components/SchoolProgressWidget'
import PendingTicketsWidget from '@/components/PendingTicketsWidget'

export default function DashboardWidgets() {
  return (
    <>
      <ProfileStrength />
      <TravelingModeBanner />
      <PendingTicketsWidget />
      <InviteWidget />
      <BoardsWidget />
      <SchoolProgressWidget />
    </>
  )
}
