// Centralized map tile URLs. CARTO's dark basemaps require a free API key
// appended as a `key` parameter (keyless requests render an "API key
// required" watermark). Key lives in NEXT_PUBLIC_CARTO_KEY — tile URLs are
// built client-side, so a server-only var can't reach them. Restrict the
// key by HTTP referrer in the CARTO dashboard.

const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY || ''

const CARTO_DARK_BASE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export function cartoDarkTileUrl(): string {
  return CARTO_KEY ? `${CARTO_DARK_BASE}?key=${CARTO_KEY}` : CARTO_DARK_BASE
}
