// Passport privacy helper — no schema change (stored in User.preferences.privacy).
// Private location still powers discovery/planning for the owner; public views are sanitized.

export type PassportVisibility = 'public' | 'hidden'

export interface PassportPrivacy {
  passportVisibility: PassportVisibility
  showExactCoords: boolean
}

export const PASSPORT_PRIVACY_DEFAULTS: PassportPrivacy = {
  passportVisibility: 'public',
  showExactCoords: false,
}

type PrefsLike = {
  privacy?: { passportVisibility?: string; showExactCoords?: boolean } | null
} | null | undefined

export function getPassportPrivacy(prefs: PrefsLike): PassportPrivacy {
  const raw = prefs?.privacy
  return {
    passportVisibility: raw?.passportVisibility === 'hidden' ? 'hidden' : 'public',
    showExactCoords: raw?.showExactCoords === true,
  }
}

export function isPassportHidden(prefs: PrefsLike): boolean {
  return getPassportPrivacy(prefs).passportVisibility === 'hidden'
}

interface PublicLoc {
  location?: string | null
  neighborhood?: string | null
  latitude?: number | null
  longitude?: number | null
  searchRadius?: number | null
}

// Sanitize a public user payload for non-owners. Owner views skip this.
export function sanitizePassportForPublic<T extends PublicLoc>(
  user: T,
  prefs: PrefsLike,
  isOwner: boolean
): T & { passportVisibility: PassportVisibility } {
  const privacy = getPassportPrivacy(prefs)
  if (isOwner) return { ...user, passportVisibility: privacy.passportVisibility }
  if (privacy.passportVisibility === 'hidden') {
    return {
      ...user,
      location: null,
      neighborhood: null,
      latitude: null,
      longitude: null,
      searchRadius: null,
      passportVisibility: privacy.passportVisibility,
    }
  }
  if (!privacy.showExactCoords) {
    return {
      ...user,
      neighborhood: null,
      latitude: null,
      longitude: null,
      passportVisibility: privacy.passportVisibility,
    }
  }
  return { ...user, passportVisibility: privacy.passportVisibility }
}

export function directionsUrl(opts: { latitude?: number | null; longitude?: number | null; label?: string | null }): string {
  if (opts.latitude != null && opts.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${opts.latitude},${opts.longitude}`
  }
  const q = encodeURIComponent(opts.label || '')
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
