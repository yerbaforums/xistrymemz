// Single source of truth for project status display. The stored vocabulary
// drifted between the editor (IDEA / ACTIVE / IN_PROGRESS / COMPLETED) and
// the list labels (DRAFT / ACTIVE / COMPLETED / ARCHIVED), so every known
// value is mapped here and anything else degrades gracefully via humanizeEnum.

import { humanizeEnum } from './utils'

interface ProjectStatusMeta {
  label: string
  icon: string
}

const PROJECT_STATUS_META: Record<string, ProjectStatusMeta> = {
  DRAFT: { label: 'Draft', icon: '📝' },
  IDEA: { label: 'Idea', icon: '💡' },
  ACTIVE: { label: 'Active', icon: '🚀' },
  IN_PROGRESS: { label: 'In Progress', icon: '🔨' },
  COMPLETED: { label: 'Completed', icon: '✅' },
  ARCHIVED: { label: 'Archived', icon: '📦' },
}

export function getProjectStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  return PROJECT_STATUS_META[status]?.label || humanizeEnum(status)
}

export function getProjectStatusIcon(status: string | null | undefined): string {
  return (status && PROJECT_STATUS_META[status]?.icon) || '📌'
}
