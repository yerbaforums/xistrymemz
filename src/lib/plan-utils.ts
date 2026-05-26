export interface PlanGoal {
  id: string
  text: string
  description?: string
  order: number
  status: 'active' | 'completed' | 'cancelled'
}

export interface PlanMilestone {
  id: string
  title: string
  description?: string
  dueDate?: string | null
  order: number
  completed: boolean
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export type ResourceType = 'LINK' | 'DOC' | 'CHECKLIST' | 'REFERENCE' | 'FILE'

export interface PlanResource {
  id: string
  title: string
  url?: string
  type: ResourceType
  description?: string
  order: number
  completed: boolean
  fileUrl?: string | null
  mimeType?: string | null
}

export interface PlanContribution {
  id: string
  amount: number
  message: string | null
  planId: string
  userId: string
  user: { id: string; name: string | null; email: string }
  createdAt: string
}

export interface PlanJoiner {
  id: string
  planId: string
  userId: string
  role: string
  joinedAt: string
  user: { id: string; name: string | null; email: string }
}

let _idCounter = 0
function uid(): string {
  return `p_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2, 6)}`
}

function parseOldFormat(text: string): { id: string; text: string; order: number; status: 'active' }[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: uid(), text, order: i, status: 'active' as const }))
}

export function parseGoals(raw: string | null | undefined): PlanGoal[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed as PlanGoal[]
    } catch {}
  }
  return parseOldFormat(trimmed)
}

export function parseMilestones(raw: string | null | undefined, milepostStatus?: string | null): PlanMilestone[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed as PlanMilestone[]
    } catch {}
  }
  const statusMap: Record<string, boolean> = {}
  if (milepostStatus) {
    try {
      const st = JSON.parse(milepostStatus)
      if (Array.isArray(st)) {
        st.forEach((s: { id?: string; completed?: boolean }) => {
          if (s.id) statusMap[s.id] = s.completed ?? false
        })
      }
    } catch {}
  }
  return trimmed.split('\n').map(line => line.trim()).filter(Boolean).map((title, i) => {
    const id = uid()
    return { id, title, order: i, completed: statusMap[id] ?? false }
  })
}

export function parseResources(raw: string | null | undefined): PlanResource[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed as PlanResource[]
    } catch {}
  }
  return []
}

export function stringifyGoals(goals: PlanGoal[]): string {
  return JSON.stringify(goals)
}

export function stringifyMilestones(milestones: PlanMilestone[]): string {
  return JSON.stringify(milestones)
}

export function stringifyResources(resources: PlanResource[]): string {
  return JSON.stringify(resources)
}
