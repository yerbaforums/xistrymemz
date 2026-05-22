export interface EventJoiner {
  id: string
  userId: string
  role?: string
  user: {
    name: string | null
    email: string
    image?: string
    role?: string
    userClass?: string | null
    username?: string | null
  }
}

export interface Event {
  id: string
  title: string
  description: string | null
  eventCategory: string | null
  eventDate: string | null
  endDate: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  pinned: boolean
  isTicketed: boolean
  ticketPrice: number
  currency: string
  planId: string | null
  planTitle: string | null
  userId: string
  userName: string | null
  acceptsDonations?: boolean
  donationAddress?: string | null
  donationCurrency?: string | null
  donationAddresses?: string | null
  needsVolunteers?: boolean
  volunteerRoles?: string[]
  volunteerDescription?: string | null
  joiners: EventJoiner[]
  joined?: boolean
  isOrganizer?: boolean
  _count?: { eventJoiners: number }
  organizer?: {
    id: string
    name: string
    email: string
    image: string
    role: string
    username?: string | null
  }
  group?: { id: string; name: string }
  hashtags?: string[]
}

export interface DashboardEvent {
  id: string
  title: string
  description: string | null
  eventDate: string | null
  eventCategory: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number | null
  currency: string
  acceptsDonations: boolean
  donationAddress: string | null
  donationCurrency: string
  joinerCount: number
  type: string
  planTitle: string | null
  planId: string | null
  groupTitle?: string | null
  groupId?: string | null
  createdAt: string
  hashtags?: string[]
}
