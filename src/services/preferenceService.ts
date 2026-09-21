import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type ThemeMode = 'light' | 'dark'

interface UserPreferences {
  theme?: { mode?: ThemeMode; accent?: string }
  view?: Record<string, string>
  tools?: Record<string, boolean>
  notifications?: Record<string, boolean>
  delivery?: Record<string, boolean>
}

export const PREF_DEFAULTS: UserPreferences = {
  theme: { mode: 'dark', accent: 'cyan' },
  view: {},
  tools: {},
  notifications: {
    messages: true,
    connection_requests: true,
    offers: true,
    appointments: true,
    orders: true,
    comments: true,
    mentions: true,
    follows: true,
    blogs: true,
    school: true,
    system: true,
  },
  delivery: {
    in_app: true,
    email: true,
    push: false,
  },
}

const TYPE_TO_PREF_KEY: Record<string, string | null> = {
  CONNECTION_REQUEST: 'connection_requests',
  CONNECTION_ACCEPTED: 'connection_requests',
  NEW_MESSAGE: 'messages',
  PROJECT_UPDATE: 'system',
  EVENT_REMINDER: 'appointments',
  REQUEST_FULFILLED: 'orders',
  NEW_FOLLOWER: 'follows',
  MENTION: 'mentions',
  LIKE: 'comments',
  COMMENT: 'comments',
  SYSTEM: 'system',
  TICKET_PAID: 'orders',
  APPOINTMENT_REQUEST: 'appointments',
  APPOINTMENT_CONFIRMED: 'appointments',
  APPOINTMENT_DECLINED: 'appointments',
  APPOINTMENT_RESCHEDULED: 'appointments',
  APPOINTMENT_PAID: 'appointments',
  APPOINTMENT_COMPLETED: 'appointments',
  OFFER_RECEIVED: 'offers',
  OFFER_ACCEPTED: 'offers',
  OFFER_REJECTED: 'offers',
  OFFER_WITHDRAWN: 'offers',
  OFFER_COUNTERED: 'offers',
  OFFER_COMPLETED: 'offers',
  BLOG_PUBLISHED: 'blogs',
  SCHOOL_PUBLISHED: 'school',
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const v = patch[key]
    if (v === undefined || v === null) continue
    const baseVal = base[key]
    if (
      typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal) &&
      typeof v === 'object' && v !== null && !Array.isArray(v)
    ) {
      ;(result as Record<string, unknown>)[key as string] = deepMerge(baseVal as Record<string, unknown>, v as Record<string, unknown>)
    } else {
      ;(result as Record<string, unknown>)[key as string] = v
    }
  }
  return result
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { preferences: true },
  })
  const stored = (user.preferences as UserPreferences | null) || {}
  return deepMerge(PREF_DEFAULTS as Record<string, unknown>, stored as Record<string, unknown>) as UserPreferences
}

export async function setUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const existing = await getUserPreferences(userId)
  const merged = deepMerge(existing as Record<string, unknown>, patch as Record<string, unknown>) as UserPreferences
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: merged as unknown as Prisma.InputJsonObject },
  })
  return merged
}

export async function shouldNotify(userId: string, notifType: string): Promise<boolean> {
  const prefKey = TYPE_TO_PREF_KEY[notifType]
  if (!prefKey) return true
  const prefs = await getUserPreferences(userId)
  if (prefs.notifications && prefKey in prefs.notifications) {
    return prefs.notifications[prefKey] !== false
  }
  return true
}

/**
 * Whether a notification type should ALSO be delivered by email.
 * Gated by BOTH the global Email delivery toggle (Settings → Notifications →
 * Delivery Methods → Email) and the per-category toggle (e.g. Appointments).
 */
export async function shouldEmail(userId: string, notifType: string): Promise<boolean> {
  const prefs = await getUserPreferences(userId)
  if (prefs.delivery && prefs.delivery.email === false) return false
  const prefKey = TYPE_TO_PREF_KEY[notifType]
  if (!prefKey) return true
  if (prefs.notifications && prefKey in prefs.notifications) {
    return prefs.notifications[prefKey] !== false
  }
  return true
}
