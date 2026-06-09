export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface RequestSummary {
  id: string
  title: string
  description: string | null
  status: RequestStatus
  priority: RequestPriority | null
  budget: number | null
  category: string | null
  isPublic: boolean
  imageUrl: string | null
  location: string | null
  user?: { id: string; name: string | null; image: string | null }
  planId?: string | null
  productId?: string | null
  createdAt: string
  updatedAt: string
  hashtags?: Array<{ id: string; hashtag: { id: string; tag: string } }>
}
