export const PIN_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'LOST_FOUND', label: 'Lost & Found' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'JOBS', label: 'Jobs' },
  { value: 'FREE', label: 'Free' },
] as const

export function getPinCategoryLabel(value: string): string {
  return PIN_CATEGORIES.find(c => c.value === value)?.label || value
}
