export interface EntityIcon {
  emoji: string
  color: string
  label: string
}

export const ENTITY_ICONS: Record<string, EntityIcon> = {
  BOARD:     { emoji: '🪵', color: '#8B6914', label: 'Board' },
  PRODUCT:   { emoji: '🛒', color: '#3b82f6', label: 'Product' },
  EVENT:     { emoji: '📅', color: '#f59e0b', label: 'Event' },
  PROJECT:   { emoji: '🚀', color: '#8b5cf6', label: 'Project' },
  PLAN:      { emoji: '🚀', color: '#8b5cf6', label: 'Project' },
  SERVICE:   { emoji: '🔧', color: '#22c55e', label: 'Service' },
  REQUEST:   { emoji: '📝', color: '#f97316', label: 'Request' },
  GROUP:     { emoji: '👥', color: '#10b981', label: 'Group' },
  SHOP:      { emoji: '🏪', color: '#ec4899', label: 'Shop' },
  MEMBER:    { emoji: '👤', color: '#6366f1', label: 'Member' },
  RENTAL:    { emoji: '🏠', color: '#14b8a6', label: 'Rental' },
  SCHOOL:    { emoji: '🏫', color: '#f59e0b', label: 'School' },
  POST:      { emoji: '📝', color: '#6366f1', label: 'Post' },
  FORUMPOST: { emoji: '💬', color: '#6366f1', label: 'Forum Post' },
  SCHOOLCONTENT: { emoji: '📚', color: '#f59e0b', label: 'School Content' },
}

export function getEntityIcon(type: string): string {
  return ENTITY_ICONS[type]?.emoji || '📍'
}

export function getEntityColor(type: string): string {
  return ENTITY_ICONS[type]?.color || '#6b7280'
}

export function getEntityLabel(type: string): string {
  return ENTITY_ICONS[type]?.label || type
}
