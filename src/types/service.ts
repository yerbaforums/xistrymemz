export const SERVICE_CATEGORIES = [
  'PERFORMANCE',
  'RECORDING',
  'PHOTOGRAPHY',
  'DESIGN',
  'CONSULTATION',
  'LESSON_TUTORING',
  'HEALTH_WELLNESS',
  'EVENT_SERVICES',
  'LAWN_GARDEN',
  'CLEANING',
  'MAINTENANCE_REPAIR',
  'CONSTRUCTION',
  'MOVING_HAULING',
  'PET_CARE',
  'CHILDCARE',
  'TECH_SUPPORT',
  'TRANSPORTATION',
  'OTHER',
] as const

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  PERFORMANCE: 'Performance / Gigs',
  RECORDING: 'Recording & Production',
  PHOTOGRAPHY: 'Photography & Video',
  DESIGN: 'Design & Creative',
  CONSULTATION: 'Consultation',
  LESSON_TUTORING: 'Lessons & Tutoring',
  HEALTH_WELLNESS: 'Health & Wellness',
  EVENT_SERVICES: 'Event Services',
  LAWN_GARDEN: 'Lawn & Garden',
  CLEANING: 'Cleaning',
  MAINTENANCE_REPAIR: 'Maintenance & Repair',
  CONSTRUCTION: 'Construction & Remodeling',
  MOVING_HAULING: 'Moving & Hauling',
  PET_CARE: 'Pet Care',
  CHILDCARE: 'Childcare',
  TECH_SUPPORT: 'Tech Support',
  TRANSPORTATION: 'Transportation',
  OTHER: 'Other',
}

export const SERVICE_CATEGORY_ICONS: Record<ServiceCategory, string> = {
  PERFORMANCE: '🎤',
  RECORDING: '🎙️',
  PHOTOGRAPHY: '📸',
  DESIGN: '🎨',
  CONSULTATION: '💼',
  LESSON_TUTORING: '📚',
  HEALTH_WELLNESS: '🧘',
  EVENT_SERVICES: '🎪',
  LAWN_GARDEN: '🌿',
  CLEANING: '🧹',
  MAINTENANCE_REPAIR: '🔧',
  CONSTRUCTION: '🏗️',
  MOVING_HAULING: '📦',
  PET_CARE: '🐾',
  CHILDCARE: '👶',
  TECH_SUPPORT: '💻',
  TRANSPORTATION: '🚗',
  OTHER: '📋',
}

export interface ServiceOffering {
  id: string
  title: string
  description: string | null
  category: ServiceCategory
  duration: number
  price: number | null
  location: string | null
  meetingLink: string | null
  imageUrl: string | null
  isActive: boolean
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
    username: string | null
  }
  createdAt: string
  updatedAt: string
}
