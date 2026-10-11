// Canonical marketplace taxonomy shared by every surface.
//
// Problem it solves: products, shops, services, and events each shipped
// their own category enum (6 vs 25 vs 20 vs 12 values), so the same concept
// had different values per type ("ART" vs "ARTS_CRAFTS"), filters couldn't
// align, and labels disagreed. Stored values are untouched (no migration);
// this maps raw values -> canonical keys for display, and canonical keys
// -> raw values for filtering.

export interface CanonicalCategory {
  key: string
  label: string
  icon: string
}

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  { key: 'tech', label: 'Technology & Electronics', icon: '💻' },
  { key: 'arts', label: 'Arts & Crafts', icon: '🎨' },
  { key: 'auto', label: 'Automotive', icon: '🔧' },
  { key: 'kids', label: 'Baby & Kids', icon: '👶' },
  { key: 'books', label: 'Books & Media', icon: '📚' },
  { key: 'fashion', label: 'Clothing & Fashion', icon: '👔' },
  { key: 'construction', label: 'Construction & Contracting', icon: '🏗️' },
  { key: 'education', label: 'Education & Tutoring', icon: '🎓' },
  { key: 'food', label: 'Food & Dining', icon: '🍽️' },
  { key: 'garden', label: 'Garden & Outdoor', icon: '🪴' },
  { key: 'health', label: 'Health & Beauty', icon: '💇' },
  { key: 'home', label: 'Home & Decor', icon: '🏠' },
  { key: 'jewelry', label: 'Jewelry & Accessories', icon: '💍' },
  { key: 'professional', label: 'Legal & Professional', icon: '⚖️' },
  { key: 'music', label: 'Music & Entertainment', icon: '🎵' },
  { key: 'pets', label: 'Pets & Animals', icon: '🐾' },
  { key: 'photo', label: 'Photography & Video', icon: '📸' },
  { key: 'repair', label: 'Repair & Maintenance', icon: '🔨' },
  { key: 'sports', label: 'Sports & Fitness', icon: '🏃' },
  { key: 'transport', label: 'Transportation & Logistics', icon: '🚚' },
  { key: 'travel', label: 'Travel & Accommodation', icon: '✈️' },
  { key: 'vintage', label: 'Vintage & Secondhand', icon: '♻️' },
  { key: 'wellness', label: 'Wellness & Spiritual', icon: '🔮' },
  { key: 'cleaning', label: 'Cleaning', icon: '🧽' },
  { key: 'moving', label: 'Moving & Hauling', icon: '📦' },
  { key: 'childcare', label: 'Childcare', icon: '🧸' },
  { key: 'performance', label: 'Performance & Gigs', icon: '🎭' },
  { key: 'consultation', label: 'Consultation', icon: '💬' },
  { key: 'events', label: 'Events & Gatherings', icon: '📅' },
  { key: 'wedding', label: 'Weddings', icon: '💒' },
  { key: 'birthday', label: 'Birthdays', icon: '🎂' },
  { key: 'other', label: 'Other', icon: '📦' },
]

export const CANONICAL_MAP = new Map(CANONICAL_CATEGORIES.map(c => [c.key, c]))

type RawMap = Record<string, string>

const PRODUCT_MAP: RawMap = {
  ART: 'arts', ELECTRONICS: 'tech', CLOTHING: 'fashion',
  HOME: 'home', SPORTS: 'sports', OTHER: 'other',
}

const SHOP_MAP: RawMap = {
  TECHNOLOGY: 'tech', ARTS_CRAFTS: 'arts', AUTOMOTIVE: 'auto',
  BABY_KIDS: 'kids', BOOKS_MEDIA: 'books', CLOTHING_FASHION: 'fashion',
  COMPUTERS_SOFTWARE: 'tech', CONSTRUCTION: 'construction',
  EDUCATION_TUTORING: 'education', FOOD_DINING: 'food',
  GARDEN_OUTDOOR: 'garden', HEALTH_BEAUTY: 'health', HOME_DECOR: 'home',
  JEWELRY_ACCESSORIES: 'jewelry', LEGAL_PROFESSIONAL: 'professional',
  MUSIC_ENTERTAINMENT: 'music', PETS_ANIMALS: 'pets',
  PHOTOGRAPHY_VIDEO: 'photo', REPAIR_MAINTENANCE: 'repair',
  SPORTS_FITNESS: 'sports', TRANSPORTATION_LOGISTICS: 'transport',
  TRAVEL_ACCOMMODATION: 'travel', VINTAGE_SECONDHAND: 'vintage',
  WELLNESS_SPIRITUAL: 'wellness', OTHER: 'other',
}

const SERVICE_MAP: RawMap = {
  PERFORMANCE: 'performance', RECORDING: 'music', PHOTOGRAPHY: 'photo',
  DESIGN: 'arts', CONSULTATION: 'consultation', LESSON_TUTORING: 'education',
  HEALTH_WELLNESS: 'wellness', EVENT_SERVICES: 'events',
  LAWN_GARDEN: 'garden', CLEANING: 'cleaning',
  MAINTENANCE_REPAIR: 'repair', CONSTRUCTION: 'construction',
  MOVING_HAULING: 'moving', PET_CARE: 'pets', CHILDCARE: 'childcare',
  TECH_SUPPORT: 'tech', TECH_MULTIMEDIA: 'tech',
  TRANSPORTATION: 'transport', TRAVEL_TOURISM: 'travel', OTHER: 'other',
}

const EVENT_MAP: RawMap = {
  GENERAL: 'events', WEDDING: 'wedding', CORPORATE: 'professional',
  BIRTHDAY: 'birthday', MEETUP: 'events', WORKSHOP: 'education',
  CONCERT: 'music', SPORTS: 'sports', SHOP: 'events',
  OUTDOOR: 'garden', RETREAT: 'wellness', CEREMONY: 'events',
  WELLNESS: 'wellness', COMMUNITY: 'events', OTHER: 'other',
}

const MAPS: Record<string, RawMap> = {
  product: PRODUCT_MAP,
  rental: PRODUCT_MAP,
  shop: SHOP_MAP,
  service: SERVICE_MAP,
  event: EVENT_MAP,
}

/** Raw stored value -> canonical key (falls back to 'other'). */
export function canonicalKey(type: string, raw: string | null | undefined): string {
  if (!raw) return 'other'
  const map = MAPS[type]
  if (map && map[raw]) return map[raw]
  const direct = CANONICAL_MAP.has(raw) ? raw : null
  if (direct) return direct
  return 'other'
}

/** Canonical key -> display label. */
export function canonicalLabel(key: string): string {
  return CANONICAL_MAP.get(key)?.label || key
}

/** Canonical key -> display icon. */
export function canonicalIcon(key: string): string {
  return CANONICAL_MAP.get(key)?.icon || '📦'
}

/** Canonical key -> raw stored values for a type (for IN filters). */
export function rawValuesFor(type: string, canonical: string): string[] {
  const map = MAPS[type]
  if (!map) return [canonical]
  const out = Object.entries(map)
    .filter(([, v]) => v === canonical)
    .map(([k]) => k)
  return out.length > 0 ? out : [canonical]
}

/** Display info for a category value that may be a canonical key or a
 * legacy raw value (request/pin intent taxonomies stay raw on purpose). */
export function displayCategory(value: string | null | undefined): { label: string; icon: string } {
  if (!value) return { label: '', icon: '📦' }
  const hit = CANONICAL_MAP.get(value)
  if (hit) return { label: hit.label, icon: hit.icon }
  return { label: value, icon: '📦' }
}
