export type ProductType = 'PRODUCT' | 'SERVICE' | 'RENTAL'
export type PaymentType = 'BOTH' | 'ESCROW' | 'DIRECT'

export interface ProductSummary {
  id: string
  title: string
  description: string | null
  price: number | null
  type: ProductType
  category: string | null
  imageUrl: string | null
  published: boolean
  pinned: boolean
  location: string | null
  user?: { id: string; name: string | null; image: string | null }
  createdAt: string
  updatedAt: string
}

export interface ProductDetail extends ProductSummary {
  condition: string | null
  locationDetails: string | null
  paymentMethods: string | null
  paymentType: PaymentType
  acceptsRequests: boolean
  acceptsOffers: boolean
  requestPrice: number | null
  userId: string
}

export interface Product {
  id: string
  title: string
  description: string | null
  price: number | null
  type: string
  category: string | null
  condition: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  isGlobal: boolean
  isRemote: boolean
  imageUrl: string | null
  published: boolean
  pinned: boolean
  paymentMethods: string | null
  paymentType: string
  acceptsRequests: boolean
  acceptsOffers: boolean
  requestPrice: number | null
  rentalDaily: number | null
  rentalWeekly: number | null
  rentalMonthly: number | null
  rentalDeposit: number | null
  rentalMinDays: number
  rentalMaxDays: number | null
  rentalAvailable: boolean
  acceptsDonations: boolean
  donationAddress: string | null
  donationCurrency: string | null
  donationAddresses: string | null
  sellerPayoutAddress: string | null
  sellerCryptoCurrency: string | null
  userId: string
  user: { name: string | null; shopSlug?: string | null; image?: string | null }
  hashtags?: { id: string; tag: string }[]
  createdAt: string
  updatedAt: string
  viewCount?: number
}

export interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
  sortOrder: number
}
