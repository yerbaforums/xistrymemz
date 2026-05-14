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
