export interface PlatformStats {
  members: number
  shops: number
  schools: number
  products: number
  services: number
  rentals: number
  events: number
  plans: number
  requests: number
  forumPosts: number
  forumReplies: number
  offers: number
  appointments: number
  boards: number
}

export interface FeaturedShop {
  id: string
  shopName: string
  shopImage: string | null
  shopSlug: string
  _count?: { products: number }
}

export interface FeaturedProduct {
  id: string
  title: string
  price: number | null
  imageUrl: string | null
  user: { name: string | null; shopSlug: string | null }
}

export interface PublicRequest {
  id: string
  title: string
  status: string
  currentFunding: number | null
  goalAmount: number | null
  user: { name: string | null }
}

export interface FeaturedEvent {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  eventDate: string | null
  location: string | null
  eventCategory: string | null
  userName?: string | null
}

export interface PublicProject {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  user: { name: string | null }
}

export interface FeaturedBoard {
  id: string
  name: string
  slug: string
  location: string | null
  pinCount: number
}
