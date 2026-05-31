export interface EventCategory {
  value: string
  label: string
  icon: string
}

export const EVENT_CATEGORIES: EventCategory[] = [
  { value: 'GENERAL', label: 'General', icon: '📌' },
  { value: 'WEDDING', label: 'Wedding', icon: '💒' },
  { value: 'CORPORATE', label: 'Corporate', icon: '💼' },
  { value: 'BIRTHDAY', label: 'Birthday', icon: '🎂' },
  { value: 'MEETUP', label: 'Meetup', icon: '🤝' },
  { value: 'WORKSHOP', label: 'Workshop', icon: '🔧' },
  { value: 'CONCERT', label: 'Concert', icon: '🎵' },
  { value: 'SPORTS', label: 'Sports', icon: '🏆' },
  { value: 'SHOP', label: 'Shop Event', icon: '🏪' },
  { value: 'OUTDOOR', label: 'Outdoor', icon: '🌲' },
  { value: 'RETREAT', label: 'Retreat', icon: '🧘' },
  { value: 'CEREMONY', label: 'Ceremony', icon: '🕯️' },
  { value: 'WELLNESS', label: 'Wellness', icon: '💚' },
  { value: 'COMMUNITY', label: 'Community', icon: '🌍' },
  { value: 'OTHER', label: 'Other', icon: '📅' },
]

export const EVENT_CATEGORY_MAP = new Map(EVENT_CATEGORIES.map(c => [c.value, c]))
