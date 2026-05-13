'use client'

import { useState } from 'react'
import PlanSortableList from './PlanSortableList'
import styles from './sortable.module.css'
import type { PlanMilestone } from '@/lib/plan-utils'

interface PlanMilestonesProps {
  milestones: PlanMilestone[]
  isOwner: boolean
  onChange: (milestones: PlanMilestone[]) => void
}

export default function PlanMilestones({ milestones, isOwner, onChange }: PlanMilestonesProps) {
  const [newTitle, setNewTitle] = useState('')

  const handleAdd = () => {
    const title = newTitle.trim()
    if (!title) return
    const newMs: PlanMilestone = {
      id: `m_${Date.now()}`,
      title,
      order: milestones.length,
      completed: false
    }
    onChange([...milestones, newMs])
    setNewTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleToggle = (id: string) => {
    onChange(milestones.map(m =>
      m.id === id ? { ...m, completed: !m.completed } : m
    ))
  }

  const handleEdit = (id: string, title: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, title } : m))
  }

  const handleDateChange = (id: string, dueDate: string) => {
    onChange(milestones.map(m => m.id === id ? { ...m, dueDate: dueDate || null } : m))
  }

  const handleRemove = (id: string) => {
    onChange(milestones.filter(m => m.id !== id).map((m, i) => ({ ...m, order: i })))
  }

  const completedCount = milestones.filter(m => m.completed).length

  const sorted = [...milestones].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.order - b.order
  })

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3>Milestones</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {completedCount} of {milestones.length} completed
          </span>
        </div>
      </div>

      {milestones.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
            {milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0}%
          </span>
        </div>
      )}

      {milestones.length === 0 && (
        <div className={styles.emptyState}>
          <p>No milestones yet. Add key milestones to track your progress.</p>
        </div>
      )}

      <PlanSortableList
        items={milestones}
        onChange={onChange}
        renderItem={(ms, index, { handleDragStart, handleDragOver, handleDragLeave, handleDrop, isDragOver, isDragging }) => (
          <div
            key={ms.id}
            className={`${ms.completed ? styles.completedItem : styles.sortableItem} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
            draggable={isOwner}
            onDragStart={(e) => isOwner && handleDragStart(e, index)}
            onDragOver={(e) => isOwner && handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => isOwner && handleDrop(e, index)}
          >
            {isOwner && (
              <div className={styles.dragHandle} title="Drag to reorder">
                ⠿
              </div>
            )}
            <div className={styles.checkboxWrap}>
              <input
                type="checkbox"
                checked={ms.completed}
                onChange={() => handleToggle(ms.id)}
                disabled={!isOwner}
              />
            </div>
            <div className={styles.itemBody}>
              <div className={styles.itemTitle}>
                {isOwner ? (
                  <input
                    value={ms.title}
                    onChange={(e) => handleEdit(ms.id, e.target.value)}
                    className={ms.completed ? styles.completedText : ''}
                  />
                ) : (
                  <span className={ms.completed ? styles.completedText : ''}>{ms.title}</span>
                )}
                {ms.completed && <span className={styles.completedIdicator}>✓</span>}
              </div>
              <div className={styles.itemMeta}>
                {isOwner ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📅
                    <input
                      type="date"
                      value={ms.dueDate ? ms.dueDate.split('T')[0] : ''}
                      onChange={(e) => handleDateChange(ms.id, e.target.value)}
                      className={styles.dateInput}
                    />
                  </label>
                ) : ms.dueDate ? (
                  <span>📅 {new Date(ms.dueDate).toLocaleDateString()}</span>
                ) : null}
              </div>
            </div>
            {isOwner && (
              <div className={styles.itemActions}>
                <button
                  onClick={() => handleRemove(ms.id)}
                  className={styles.actionBtnDanger}
                  title="Remove milestone"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      />

      {isOwner && (
        <div className={styles.addForm}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new milestone..."
          />
          <button onClick={handleAdd} disabled={!newTitle.trim()} className={styles.addBtn}>
            Add Milestone
          </button>
        </div>
      )}
    </div>
  )
}
