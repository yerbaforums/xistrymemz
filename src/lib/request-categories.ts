export interface RequestCategory {
  value: string
  label: string
  icon: string
}

export const REQUEST_CATEGORIES: RequestCategory[] = [
  { value: 'FUNDING', label: 'Funding', icon: '💰' },
  { value: 'GENERAL', label: 'General', icon: '📋' },
  { value: 'HELP', label: 'Help', icon: '🆘' },
  { value: 'COLLABORATION', label: 'Collaboration', icon: '🤝' },
  { value: 'SUPPORT', label: 'Support', icon: '🤗' },
  { value: 'RESOURCES', label: 'Resources', icon: '📦' },
  { value: 'FEEDBACK', label: 'Feedback', icon: '💬' },
  { value: 'IDEA', label: 'Idea', icon: '💡' },
  { value: 'PRODUCT', label: 'Product', icon: '🛒' },
  { value: 'SERVICE', label: 'Service', icon: '🔧' },
]

export const REQUEST_CATEGORY_MAP = new Map(REQUEST_CATEGORIES.map(c => [c.value, c]))

export const REQUEST_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export type RequestPriority = (typeof REQUEST_PRIORITIES)[number]

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  URGENT: '#ef4444'
}
