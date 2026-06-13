'use client'

import { useState } from 'react'
import ProjectSortableList from './ProjectSortableList'
import styles from './sortable.module.css'
import { EmptyState } from '@/components/EmptyState'
import type { ProjectGoal } from '@/lib/project-utils'

interface ProjectGoalsProps {
  goals: ProjectGoal[]
  isOwner: boolean
  onChange: (goals: ProjectGoal[]) => void
}

export default function ProjectGoals({ goals, isOwner, onChange }: ProjectGoalsProps) {
  const [newText, setNewText] = useState('')

  const handleAdd = () => {
    const text = newText.trim()
    if (!text) return
    const newGoal: ProjectGoal = {
      id: `g_${Date.now()}`,
      text,
      order: goals.length,
      status: 'active'
    }
    onChange([...goals, newGoal])
    setNewText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleToggle = (id: string) => {
    onChange(goals.map(g =>
      g.id === id ? { ...g, status: g.status === 'completed' ? 'active' : 'completed' as const } : g
    ))
  }

  const handleEdit = (id: string, text: string) => {
    onChange(goals.map(g => g.id === id ? { ...g, text } : g))
  }

  const handleRemove = (id: string) => {
    onChange(goals.filter(g => g.id !== id).map((g, i) => ({ ...g, order: i })))
  }

  const completedCount = goals.filter(g => g.status === 'completed').length
  const activeCount = goals.length - completedCount

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3>Project Goals</h3>
          <span className={styles.goalsSummary}>
            {completedCount} of {goals.length} completed
          </span>
        </div>
      </div>

      {goals.length > 0 && (
        <div className={styles.progressRow}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${goals.length > 0 ? (completedCount / goals.length) * 100 : 0}%` }} />
          </div>
          <span className={styles.progressPct}>
            {goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0}%
          </span>
        </div>
      )}

      <ProjectSortableList
        items={goals}
        onChange={onChange}
        renderItem={(goal, index, { handleDragStart, handleDragOver, handleDragLeave, handleDrop, isDragOver, isDragging }) => (
          <div
            key={goal.id}
            className={`${goal.status === 'completed' ? styles.completedItem : styles.sortableItem} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
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
                checked={goal.status === 'completed'}
                onChange={() => handleToggle(goal.id)}
                disabled={!isOwner}
              />
            </div>
            <div className={styles.itemBody}>
              <div className={styles.itemTitle}>
                {isOwner ? (
                  <input
                    value={goal.text}
                    onChange={(e) => handleEdit(goal.id, e.target.value)}
                    className={goal.status === 'completed' ? styles.completedText : ''}
                  />
                ) : (
                  <span className={goal.status === 'completed' ? styles.completedText : ''}>{goal.text}</span>
                )}
                {goal.status === 'completed' && <span className={styles.completedIdicator}>✓</span>}
              </div>
              {goal.description && (
                <div className={styles.itemDescription}>{goal.description}</div>
              )}
            </div>
            {isOwner && (
              <div className={styles.itemActions}>
                <button
                  onClick={() => handleRemove(goal.id)}
                  className={styles.actionBtnDanger}
                  title="Remove goal"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      />

      {goals.length === 0 && (
        <EmptyState icon="🎯" title="No goals defined yet" description="Add your first goal below." action={isOwner ? { label: 'Add Goal', onClick: () => (document.querySelector('input[placeholder="Add a new goal..."]') as HTMLInputElement)?.focus() } : undefined} />
      )}

      {isOwner && (
        <div className={styles.addForm}>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new goal..."
          />
          <button onClick={handleAdd} disabled={!newText.trim()} className={styles.addBtn}>
            Add Goal
          </button>
        </div>
      )}
    </div>
  )
}
