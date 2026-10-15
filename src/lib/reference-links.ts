// Single builder for public view URLs of referenced entities. Most types use
// flat /<route>/<id> URLs, but slug-nested types (school content) need their
// parent slug — previously each call site guessed and 404'd.

import { humanizeEnum } from './utils'

const FLAT_ROUTES: Record<string, string> = {
  PRODUCT: 'products',
  SERVICE: 'services',
  EVENT: 'events',
  REQUEST: 'requests',
  PROJECT: 'projects',
  GROUP: 'groups',
  POST: 'posts',
  FORUMPOST: 'community/forum',
  BOARD: 'boards',
  USER: 'profile',
  SHOP: 'shop',
  SCHOOL: 'school',
  BLOG: 'blog',
  PODCAST: 'podcast',
}

export function buildReferenceHref(type: string, id: string, slug?: string | null): string {
  if (type === 'SCHOOLCONTENT') {
    return slug ? `/school/${slug}/content/${id}` : '/schools'
  }
  const route = FLAT_ROUTES[type]
  return route ? `/${route}/${id}` : '#'
}

export function referenceTypeLabel(type: string | null | undefined): string {
  return humanizeEnum(type) || 'Link'
}
