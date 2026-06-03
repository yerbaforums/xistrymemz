export const USER_CLASSES = [
  'Healer', 'Revealer', 'Seer', 'Teacher', 'Guide', 'Warrior',
  'Guardian', 'Sage', 'Mystic', 'Architect', 'Artist', 'Builder',
  'Explorer', 'Mentor',
] as const

export type UserClass = (typeof USER_CLASSES)[number]

export const CLASS_ICONS: Record<string, string> = {
  Healer: '💚',
  Revealer: '👁️',
  Seer: '🔮',
  Teacher: '📚',
  Guide: '🧭',
  Warrior: '⚔️',
  Guardian: '🛡️',
  Sage: '🦉',
  Mystic: '✨',
  Architect: '🏗️',
  Artist: '🎨',
  Builder: '🔨',
  Explorer: '🌍',
  Mentor: '🌟',
}

const KEYWORDS: Record<string, string[]> = {
  Healer: ['heal', 'health', 'wellness', 'therapy', 'medicine', 'self-care', 'mental', 'recovery', 'holistic'],
  Revealer: ['truth', 'investigation', 'journalism', 'research', 'reveal', 'transparency', 'expose', 'documentary'],
  Seer: ['vision', 'future', 'insight', 'prophecy', 'divination', 'astrology', 'spiritual', 'intuition'],
  Teacher: ['teach', 'education', 'learn', 'lesson', 'workshop', 'training', 'course', 'tutorial', 'curriculum'],
  Guide: ['guide', 'navigation', 'leadership', 'direction', 'mentor', 'advise', 'counsel', 'orient'],
  Warrior: ['activism', 'justice', 'courage', 'defense', 'rights', 'advocacy', 'protect', 'movement'],
  Guardian: ['protect', 'security', 'safety', 'steward', 'defense', 'caretake', 'guard', 'preserve'],
  Sage: ['wisdom', 'philosophy', 'knowledge', 'contemplation', 'meditation', 'reflect', 'ancient'],
  Mystic: ['mystic', 'ritual', 'ceremony', 'sacred', 'shaman', 'energy', 'consciousness', 'awaken'],
  Architect: ['design', 'architecture', 'planning', 'blueprint', 'infrastructure', 'urban', 'structure', 'system'],
  Artist: ['art', 'creative', 'design', 'music', 'paint', 'sculpt', 'perform', 'craft', 'express', 'gallery'],
  Builder: ['build', 'construction', 'fabrication', 'maker', 'woodwork', 'engineering', 'craftsman', 'workshop'],
  Explorer: ['explore', 'adventure', 'travel', 'discovery', 'nature', 'outdoor', 'expedition', 'wilderness'],
  Mentor: ['mentor', 'guidance', 'coach', 'support', 'growth', 'develop', 'nurture', 'empower', 'inspire'],
}

export function classFilterKeywords(className: string): string[] {
  return KEYWORDS[className] || []
}

export function matchesClass(text: string, className: string): boolean {
  const keywords = classFilterKeywords(className)
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}
