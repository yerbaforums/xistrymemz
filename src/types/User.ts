export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR'

export interface UserPublic {
  id: string
  name: string | null
  username: string | null
  image: string | null
  coverImage: string | null
  bio: string | null
  location: string | null
  website: string | null
  userClass: string | null
  role: UserRole
  shopSlug: string | null
  schoolSlug: string | null
  createdAt: string
  lastActiveAt: string | null
  lookingForCollaborators: boolean
  acceptsDonations: boolean
  _count?: {
    projects: number
    posts: number
    products: number
  }
}

export interface UserLink {
  id: string
  type: string
  url: string
  label: string | null
  icon: string | null
  sortOrder: number
}

export interface UserLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  isPrimary: boolean
}
