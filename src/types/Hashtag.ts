export interface HashtagItem {
  tag: string
  postCount: number
  entities: {
    posts: number
    products: number
    events: number
    services: number
    schoolContents: number
    plans: number
    requests: number
    groups: number
    forumPosts: number
    groupPosts: number
  }
}

export type HashtagEntityType =
  | 'POST'
  | 'PRODUCT'
  | 'EVENT'
  | 'SERVICE'
  | 'SCHOOLCONTENT'
  | 'PLAN'
  | 'REQUEST'
  | 'GROUP'
  | 'FORUMPOST'
  | 'GROUPPOST'
