// Effective listing location — resolves where a product/service "is" for
// display and distance filtering.
//
// Rules (single source of truth):
// - If the listing opted in (travelsWithOwner) AND the owner is in passport
//   Traveling mode with coordinates, the listing's effective location is the
//   owner's current passport location.
// - Otherwise the listing's own static location applies.
//
// Privacy: the traveling-derived location is passport data. For public
// viewers, hide it when the owner's passport is hidden ("✈️ Traveling"
// without a city, no pins). Private views (owner, server-side filtering)
// keep the real values.

export interface ListingLocationFields {
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  travelsWithOwner?: boolean | null
}

export interface OwnerPassportFields {
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  traveling?: boolean | null
}

export interface EffectiveListingLocation {
  location: string | null
  latitude: number | null
  longitude: number | null
  /** True when this location was inherited from a traveling owner. */
  traveling: boolean
}

/** Owner prefs as stored on User.preferences (Json). */
export function isPassportHidden(preferences: unknown): boolean {
  const prefs = preferences as { privacy?: { passportVisibility?: string } } | null | undefined
  return prefs?.privacy?.passportVisibility === 'hidden'
}

export function getEffectiveListingLocation(
  listing: ListingLocationFields,
  owner: OwnerPassportFields | null | undefined,
): EffectiveListingLocation {
  const inherited =
    Boolean(listing?.travelsWithOwner) &&
    Boolean(owner?.traveling) &&
    owner?.latitude != null &&
    owner?.longitude != null

  if (inherited) {
    return {
      location: owner!.location || null,
      latitude: owner!.latitude!,
      longitude: owner!.longitude!,
      traveling: true,
    }
  }

  return {
    location: listing?.location || null,
    latitude: listing?.latitude ?? null,
    longitude: listing?.longitude ?? null,
    traveling: false,
  }
}

/**
 * Strip the traveling-derived location for non-owner viewers when the
 * owner's passport is hidden. Static listing locations are listing data and
 * are never stripped.
 */
export function sanitizeEffectiveLocationForPublic(
  loc: EffectiveListingLocation,
  passportHidden: boolean,
): EffectiveListingLocation {
  if (!loc.traveling || !passportHidden) return loc
  return { ...loc, location: null, latitude: null, longitude: null }
}
