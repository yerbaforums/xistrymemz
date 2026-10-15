// Single source of truth for board pin categories — labels, icons, and
// colors. Previously duplicated (with drifting values) across BoardPinCard,
// PinCarouselModal, BoardDetailClient's map markers, and the pin detail page.

export interface PinCategory {
  value: string
  label: string
  icon: string
  color: string
}

export const PIN_CATEGORIES: PinCategory[] = [
  { value: 'GENERAL', label: 'General', icon: '📌', color: '#6b7280' },
  { value: 'LOST_FOUND', label: 'Lost & Found', icon: '🔍', color: '#f59e0b' },
  { value: 'PROMOTION', label: 'Promotion', icon: '📣', color: '#3b82f6' },
  { value: 'EVENT', label: 'Event', icon: '📅', color: '#8b5cf6' },
  { value: 'SERVICE', label: 'Service', icon: '🔧', color: '#10b981' },
  { value: 'HOUSING', label: 'Housing', icon: '🏠', color: '#ec4899' },
  { value: 'JOBS', label: 'Jobs', icon: '💼', color: '#14b8a6' },
  { value: 'FREE', label: 'Free', icon: '🎁', color: '#22c55e' },
]

export function getPinCategoryLabel(value: string | null | undefined): string {
  return PIN_CATEGORIES.find(c => c.value === value)?.label || 'General'
}

export function getPinCategoryColor(value: string | null | undefined): string {
  return PIN_CATEGORIES.find(c => c.value === value)?.color || PIN_CATEGORIES[0].color
}

export function getPinCategoryIcon(value: string | null | undefined): string {
  return PIN_CATEGORIES.find(c => c.value === value)?.icon || PIN_CATEGORIES[0].icon
}
