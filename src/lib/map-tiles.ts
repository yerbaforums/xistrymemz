// Centralized map tile URLs. CARTO's dark basemaps require a free API key.
// Key lives in NEXT_PUBLIC_CARTO_KEY — tile URLs are built client-side, so
// a server-only var can't reach them. Restrict the key by HTTP referrer
// in the CARTO dashboard.
//
// CARTO basemaps API base URL. Default is CARTO's US East region; CARTO may
// assign you a different regional endpoint.
const CARTO_API_BASE_URL =
  process.env.NEXT_PUBLIC_CARTO_API_BASE_URL ||
  'https://gcp-us-east1.api.carto.com'
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY || ''

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

/** Build a CARTO basemap tile URL for the dark style. Falls back to OSM when no key. */
export function cartoDarkTileUrl(): string {
  if (!CARTO_KEY) return CARTO_DARK_BASE_URL
  return `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
}

const CARTO_DARK_BASE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
