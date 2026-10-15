// Single source of truth for school content categories — broad subject areas
// (Math, Reading, Nature, Health, ...) used by the Schools browser, the
// content creation forms, and the schools API allowlist.

export interface SchoolCategory {
  value: string
  label: string
  icon: string
}

export const SCHOOL_CATEGORIES: SchoolCategory[] = [
  { value: 'general', label: 'General', icon: '📚' },
  { value: 'elementary', label: 'Elementary (K–5)', icon: '🧒' },
  { value: 'middle', label: 'Middle School (6–8)', icon: '🎒' },
  { value: 'high', label: 'High School (9–12)', icon: '🏫' },
  { value: 'higher-ed', label: 'Higher Education', icon: '🎓' },
  { value: 'math', label: 'Math', icon: '🔢' },
  { value: 'reading', label: 'Reading & Writing', icon: '📖' },
  { value: 'science', label: 'Science', icon: '🔬' },
  { value: 'biology', label: 'Biology', icon: '🧬' },
  { value: 'chemistry', label: 'Chemistry', icon: '⚗️' },
  { value: 'physics', label: 'Physics', icon: '⚛️' },
  { value: 'nature', label: 'Nature & Environment', icon: '🌿' },
  { value: 'health', label: 'Health & Wellness', icon: '🏥' },
  { value: 'medicine', label: 'Medicine', icon: '🩺' },
  { value: 'psychology', label: 'Psychology', icon: '🧠' },
  { value: 'history', label: 'History', icon: '🏛️' },
  { value: 'geography', label: 'Geography', icon: '🌍' },
  { value: 'languages', label: 'Languages', icon: '🗣️' },
  { value: 'philosophy', label: 'Philosophy', icon: '🤔' },
  { value: 'philanthropy', label: 'Philanthropy', icon: '🤲' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'programming', label: 'Programming', icon: '👩‍💻' },
  { value: 'engineering', label: 'Engineering', icon: '⚙️' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'economics', label: 'Economics', icon: '📈' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'art', label: 'Art', icon: '🖼️' },
  { value: 'theater', label: 'Theater', icon: '🎭' },
  { value: 'acting', label: 'Acting', icon: '🎬' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'film', label: 'Film & Video', icon: '🎥' },
  { value: 'astrology', label: 'Astrology', icon: '🔮' },
  { value: 'spirituality', label: 'Spirituality', icon: '🧘' },
  { value: 'cooking', label: 'Cooking', icon: '🍳' },
]

export const SCHOOL_CATEGORY_MAP = new Map(SCHOOL_CATEGORIES.map(c => [c.value, c]))

export const SCHOOL_CATEGORY_VALUES = new Set(SCHOOL_CATEGORIES.map(c => c.value))

/** Lenient normalizer for API input: allowlisted values pass through (case-insensitive), everything else becomes undefined (stored as NULL → displayed as General). */
export function normalizeSchoolCategory(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  return SCHOOL_CATEGORY_VALUES.has(v) ? v : undefined
}

export function getSchoolCategoryLabel(value: string | null | undefined): string {
  if (!value) return 'General'
  return SCHOOL_CATEGORY_MAP.get(value)?.label || value
}

export function getSchoolCategoryIcon(value: string | null | undefined): string {
  if (!value) return '📚'
  return SCHOOL_CATEGORY_MAP.get(value)?.icon || '📚'
}
