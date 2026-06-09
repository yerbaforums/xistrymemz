export type GroupPrivacy = 'PUBLIC' | 'PRIVATE'

export interface GroupSummary {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  category: string | null
  privacy: GroupPrivacy
  memberCount: number
  createdAt: string
  updatedAt: string
  hashtags?: Array<{ id: string; hashtag: { id: string; tag: string } }>
}
