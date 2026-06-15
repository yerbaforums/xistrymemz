export interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
  sortOrder: number
}

export interface RequestBase {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  images?: string | null
  status: string
  category: string
  priority: string
  budget: number | null
  goalAmount: number | null
  currentFunding: number | null
  payoutAddress: string | null
  payoutCurrency: string | null
  deadline: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  likes: number
  reposts: number
  isPublic: boolean
  allowFulfillments: boolean
  showDonationAddress: boolean
  createdAt: string
  updatedAt?: string
  project: { id: string; title: string } | null
  group: { id: string; name: string } | null
  product: { id: string; title: string } | null
  schoolContent: { id: string; title: string } | null
  event: { id: string; title: string } | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    shopSlug: string | null
    donationAddresses: DonationAddr[]
  }
  commentCount: number
  fulfillmentCount: number
  supportCount: number
  viewCount?: number
  hashtags?: Array<{ id: string; hashtag: { id: string; tag: string } }>
}

export interface RequestFormData {
  title: string
  description: string
  category: string
  priority: string
  budget: string
  goalAmount: string
  location: string
  deadline: string
  isPublic: boolean
  allowFulfillments: boolean
  showDonationAddress: boolean
  images: string[]
  hashtags: string[]
  projectId?: string
}

export function getDefaultRequestFormData(): RequestFormData {
  return {
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    budget: '',
    goalAmount: '',
    location: '',
    deadline: '',
    isPublic: true,
    allowFulfillments: true,
    showDonationAddress: true,
    images: [],
    hashtags: [],
  }
}
