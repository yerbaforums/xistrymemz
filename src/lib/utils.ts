/**
 * Turn a raw DB enum/token into a display label.
 *   'LIKE_NEW' → 'Like New', 'PENDING' → 'Pending', 'forumPost' → 'Forum Post'
 * Already-human text ('Bug Report', 'Lost & Found') passes through unchanged.
 * Never use this for currency codes or acronyms that must stay uppercase.
 */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function slugify(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getUserProfileParam(user: { id: string; username?: string | null }): string {
  return user.username || user.id
}

export function getUserProfileUrl(user: { id: string; username?: string | null }): string {
  return `/profile/${getUserProfileParam(user)}`
}

/**
 * Safely parse a "JSON array of URLs" column. Never throws —
 * malformed or non-array values render as no images instead of
 * crashing the page for every viewer.
 */
export function parseImageList(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const parsed: unknown = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}
