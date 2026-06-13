'use client'

import { useState } from 'react'
import ProjectSortableList from './ProjectSortableList'
import styles from './sortable.module.css'
import { EmptyState } from '@/components/EmptyState'
import type { ProjectMilestone } from '@/lib/project-utils'

interface ProjectMilestonesProps {
  milestones: ProjectMilestone[]
  isOwner: boolean
  onChange: (milestones: ProjectMilestone[]) => void
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' }
const PRIORITY_ICONS: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }

function isOverdue(ms: ProjectMilestone): boolean {
  return !!ms.dueDate && !ms.completed && new Date(ms.dueDate) < new Date()
}

function urgencyScore(ms: ProjectMilestone): number {
  if (ms.completed) return 99
  if (isOverdue(ms)) return -1
  return (PRIORITY_ORDER[ms.priority || 'medium'] ?? 3)
}

export default function ProjectMilestones({ milestones, isOwner, onChange }: ProjectMilestonesProps) {
  const [newTitle, setNewTitle] = useState('')

  const handleAdd = () => {
    const title = newTitle.trim()
    if (!title) return
    const newMs: ProjectMilestone = {
      id: `m_${Date.now()}`,
      title,
      order: milestones.length,
      completed: false,
      priority: 'medium'
    }
    onChange([...milestones, newMs])
    setNewTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
  }

  const handleToggle = (id: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m))
  }

  const handleEdit = (id: string, title: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, title } : m))
  }

  const handleDateChange = (id: string, dueDate: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, dueDate: dueDate || null } : m))
  }

  const handlePriorityChange = (id: string, priority: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, priority: priority as ProjectMilestone['priority'] } : m))
  }

  const handleRemove = (id: string) => {
    onChange(milestones.filter(m => m.id !== id).map((m, i) => ({ ...m, order: i })))
  }

  const completedCount = milestones.filter(m => m.completed).length
  const overdueCount = milestones.filter(m => isOverdue(m)).length

  const sorted = [...milestones].sort((a, b) => {
    const ua = urgencyScore(a)
    const ub = urgencyScore(b)
    if (ua !== ub) return ua - ub
    return a.order - b.order
  })

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3>Milestones</h3>
          <span className={styles.milestoneSummary}>
            {completedCount} of {milestones.length} completed
            {overdueCount > 0 && <span className={styles.overdueChip}>🔴 {overdueCount} overdue</span>}
          </span>
        </div>
      </div>

      {milestones.length > 0 && (
        <div className={styles.progressSection}>
          <div className={styles.milestoneRow}>
            <div style={{ flex: 1, height: '8px', background: overdueCount > 0 ? 'rgba(239,68,68,0.2)' : 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))', borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>
            <span className={styles.progressPct} style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: overdueCount > 0 ? 600 : 400 }}>
              {milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0}%
            </span>
          </div>
          {overdueCount > 0 && (
            <div className={styles.overdueWarning}>
              <span>⚠️</span> <span>{overdueCount} milestone{overdueCount !== 1 ? 's' : ''} past due date — prioritize completion</span>
            </div>
          )}
        </div>
      )}

      {milestones.length === 0 && (
        <EmptyState icon="🏁" title="No milestones yet" description="Add key milestones to track your progress." action={isOwner ? { label: 'Add Milestone', onClick: () => (document.querySelector('input[placeholder="Add a new milestone..."]') as HTMLInputElement)?.focus() } : undefined} />
      )}

      <ProjectSortableList
        items={sorted}
        onChange={onChange}
        renderItem={(ms, index, { handleDragStart, handleDragOver, handleDragLeave, handleDrop, isDragOver, isDragging }) => {
          const overdue = isOverdue(ms)
          const priColor = PRIORITY_COLORS[ms.priority || 'medium'] || '#888'
          const priIcon = PRIORITY_ICONS[ms.priority || 'medium'] || '🟡'
          return (
            <div
              key={ms.id}
              className={`${ms.completed ? styles.completedItem : styles.sortableItem} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''} ${overdue ? styles.overdue : ''}`}
              draggable={isOwner}
              onDragStart={(e) => isOwner && handleDragStart(e, index)}
              onDragOver={(e) => isOwner && handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => isOwner && handleDrop(e, index)}
              style={overdue ? { borderLeftColor: '#ef4444', borderLeftWidth: '3px' } : { borderLeftColor: priColor, borderLeftWidth: '3px' }}
            >
              {isOwner && <div className={styles.dragHandle} title="Drag to reorder">⠿</div>}
              <div className={styles.checkboxWrap}>
                <input type="checkbox" checked={ms.completed} onChange={() => handleToggle(ms.id)} disabled={!isOwner} />
              </div>
              <div className={styles.itemBody}>
                <div className={styles.itemTitle}>
                  {isOwner ? (
                    <input value={ms.title} onChange={(e) => handleEdit(ms.id, e.target.value)} className={ms.completed ? styles.completedText : ''} />
                  ) : (
                    <span className={ms.completed ? styles.completedText : ''}>{ms.title}</span>
                  )}
                  {ms.completed && <span className={styles.completedIndicator}>✓</span>}
                  {overdue && <span className={styles.overdueBadge}>⚠️ OVERDUE</span>}
                </div>
                <div className={styles.itemMeta}>
                  {isOwner && (
                    <>
                      <select value={ms.priority || 'medium'} onChange={(e) => handlePriorityChange(ms.id, e.target.value)} className={styles.prioritySelect} style={{ borderColor: priColor + '40', color: priColor }}>
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="critical">🔴 Critical</option>
                      </select>
                      <label className={styles.dateLabel}>
                        📅
                        <input type="date" value={ms.dueDate ? ms.dueDate.split('T')[0] : ''} onChange={(e) => handleDateChange(ms.id, e.target.value)} className={styles.dateInput} />
                      </label>
                    </>
                  )}
                  {!isOwner && ms.dueDate && (
                    <span style={{ fontSize: '0.75rem', color: overdue ? '#ef4444' : 'var(--text-muted)' }}>
                      📅 {new Date(ms.dueDate).toLocaleDateString()}
                      {overdue && ' ⚠️'}
                    </span>
                  )}
                  {!isOwner && ms.priority && (
                    <span style={{ fontSize: '0.75rem', color: priColor }}>{priIcon} {ms.priority}</span>
                  )}
                </div>
              </div>
              {isOwner && (
                <div className={styles.itemActions}>
                  <button onClick={() => handleRemove(ms.id)} className={styles.actionBtnDanger} title="Remove milestone">✕</button>
                </div>
              )}
            </div>
          )
        }}
      />

      {isOwner && (
        <div className={styles.addForm}>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={handleKeyDown} placeholder="Add a new milestone..." />
          <button onClick={handleAdd} disabled={!newTitle.trim()} className={styles.addBtn}>Add Milestone</button>
        </div>
      )}
    </div>
  )
}
