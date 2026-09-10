'use client'

import ProfileStrength from '@/components/ProfileStrength'
import TravelingModeBanner from '@/components/TravelingModeBanner'
import BoardsWidget from '@/components/BoardsWidget'
import InviteWidget from '@/components/InviteWidget'
import SchoolProgressWidget from '@/components/SchoolProgressWidget'
import PendingTicketsWidget from '@/components/PendingTicketsWidget'
import ConstellationPreview from '@/components/ConstellationPreview'
import PeopleYouMayKnow from '@/components/PeopleYouMayKnow'

export default function DashboardWidgets() {
  return (
    <>
      <ProfileStrength />
      <TravelingModeBanner />
      <ConstellationPreview />
      <PendingTicketsWidget />
      <InviteWidget />
      <BoardsWidget />
      <SchoolProgressWidget />
      <PeopleYouMayKnow limit={5} />
    </>
  )
}
