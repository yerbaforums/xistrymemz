export const PROJECT_CATEGORIES = [
  { value: 'TECHNOLOGY', label: 'Technology', icon: '💻', color: '#00d9ff' },
  { value: 'CREATIVE', label: 'Creative', icon: '🎨', color: '#ff3366' },
  { value: 'EDUCATION', label: 'Education', icon: '📚', color: '#00ff88' },
  { value: 'ENVIRONMENT', label: 'Environment', icon: '🌿', color: '#22c55e' },
  { value: 'NATURE', label: 'Nature', icon: '🌲', color: '#16a34a' },
  { value: 'GARDENING', label: 'Gardening', icon: '🌱', color: '#65a30d' },
  { value: 'COMMUNITY', label: 'Community', icon: '🏘️', color: '#f59e0b' },
  { value: 'SCIENCE', label: 'Science', icon: '🔬', color: '#8b5cf6' },
  { value: 'MUSIC', label: 'Music', icon: '🎵', color: '#ec4899' },
  { value: 'FOOD', label: 'Food', icon: '🍽️', color: '#f97316' },
  { value: 'TRAVEL', label: 'Travel', icon: '✈️', color: '#14b8a6' },
  { value: 'FASHION', label: 'Fashion', icon: '👗', color: '#e879f9' },
  { value: 'PHOTOGRAPHY', label: 'Photography', icon: '📷', color: '#a855f7' },
  { value: 'WRITING', label: 'Writing', icon: '✍️', color: '#3b82f6' },
  { value: 'GAMING', label: 'Gaming', icon: '🎮', color: '#7c3aed' },
  { value: 'PETS', label: 'Pets', icon: '🐾', color: '#d97706' },
  { value: 'DIY', label: 'DIY', icon: '🛠️', color: '#eab308' },
  { value: 'HEALTH', label: 'Health', icon: '❤️', color: '#ef4444' },
  { value: 'SOCIAL', label: 'Social', icon: '🤝', color: '#f59e0b' },
  { value: 'BUSINESS', label: 'Business', icon: '💼', color: '#8b5cf6' },
  { value: 'SPORTS', label: 'Sports', icon: '⚽', color: '#f97316' },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎭', color: '#ec4899' },
  { value: 'OTHER', label: 'Other', icon: '📌', color: '#888888' },
] as const

export function getCategoryIcon(value: string): string {
  return PROJECT_CATEGORIES.find(c => c.value === value)?.icon || '📌'
}

export function getCategoryColor(value: string): string {
  return PROJECT_CATEGORIES.find(c => c.value === value)?.color || '#888888'
}

export function getCategoryLabel(value: string): string {
  return PROJECT_CATEGORIES.find(c => c.value === value)?.label || value
}
