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
