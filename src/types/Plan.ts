export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface PlanSummary {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  status: PlanStatus
  published: boolean
  pinned: boolean
  _count?: { requests: number }
  user?: { id: string; name: string | null; image: string | null }
  createdAt: string
  updatedAt: string
}

export interface PlanDetail extends PlanSummary {
  goals: string | null
  mileposts: string | null
  milepostStatus: string | null
  lookingForCollaborators: boolean
  acceptsDonations: boolean
  donationAddress: string | null
  donationCurrency: string | null
  donationDescription: string | null
  donationAddresses: string | null
  userId: string
  requests?: Array<{ id: string; title: string; status: string }>
  joiners?: Array<{ id: string; userId: string; user: { name: string | null; image: string | null } }>
  events?: Array<{ id: string; title: string; eventDate: string | null }>
}
