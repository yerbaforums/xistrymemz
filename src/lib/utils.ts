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
