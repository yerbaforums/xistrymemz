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
  imageUrl: string | null
  eventCategory: string | null
  eventDate: string | null
  endDate: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  pinned: boolean
  isPrivate?: boolean
  isTicketed: boolean
  ticketPrice: number
  currency: string
  isVirtual?: boolean
  meetingLink?: string | null
  projectId: string | null
  projectTitle: string | null
  groupId?: string | null
  schoolId?: string | null
  shopId?: string | null
  school?: { id: string; schoolName?: string | null; name?: string | null } | null
  shop?: { id: string; shopName?: string | null; name?: string | null } | null
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
  myTicket?: {
    id: string
    quantity: number
    paymentStatus: string
    ticketCode: string
    txHash: string | null
    selectedCurrency: string | null
    selectedAddress: string | null
  } | null
}

export interface DashboardEvent {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  eventDate: string | null
  endDate: string | null
  eventCategory: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number | null
  currency: string
  isVirtual?: boolean
  meetingLink?: string | null
  myTicket?: { paymentStatus: string; ticketCode: string } | null
  acceptsDonations: boolean
  donationAddress: string | null
  donationCurrency: string
  joinerCount: number
  type: string
  projectTitle: string | null
  projectId: string | null
  groupTitle?: string | null
  groupId?: string | null
  schoolId?: string | null
  shopId?: string | null
  needsVolunteers?: boolean
  volunteerRoles?: string
  volunteerDescription?: string | null
  createdAt: string
  hashtags?: string[]
}
