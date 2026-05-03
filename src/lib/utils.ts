export function slugify(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getUserProfileParam(user: { id: string; name?: string | null; shopSlug?: string | null }): string {
  return user.shopSlug || slugify(user.name) || user.id
}

export function getUserProfileUrl(user: { id: string; name?: string | null; shopSlug?: string | null }): string {
  return `/profile/${getUserProfileParam(user)}`
}
