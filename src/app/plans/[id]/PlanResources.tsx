'use client'

import { useState } from 'react'
import styles from './resources.module.css'
import { EmptyState } from '@/components/EmptyState'
import type { PlanResource, ResourceType } from '@/lib/plan-utils'

const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  LINK: '🔗',
  DOC: '📄',
  CHECKLIST: '✅',
  REFERENCE: '📚',
  FILE: '📎'
}

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  LINK: 'Link',
  DOC: 'Document',
  CHECKLIST: 'Checklist',
  REFERENCE: 'Reference',
  FILE: 'File'
}

interface PlanResourcesProps {
  resources: PlanResource[]
  isOwner: boolean
  onChange: (resources: PlanResource[]) => void
}

export default function PlanResources({ resources, isOwner, onChange }: PlanResourcesProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType>('LINK')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!title.trim()) return
    if (editingId) {
      onChange(resources.map(r =>
        r.id === editingId
          ? { ...r, title: title.trim(), url: url.trim(), type: resourceType, description: description.trim() }
          : r
      ))
    } else {
      const newResource: PlanResource = {
        id: `r_${Date.now()}`,
        title: title.trim(),
        url: url.trim(),
        type: resourceType,
        description: description.trim(),
        order: resources.length,
        completed: false
      }
      onChange([...resources, newResource])
    }
    resetForm()
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setTitle('')
    setUrl('')
    setResourceType('LINK')
    setDescription('')
  }

  const handleEdit = (r: PlanResource) => {
    setEditingId(r.id)
    setTitle(r.title)
    setUrl(r.url || '')
    setResourceType(r.type)
    setDescription(r.description || '')
    setShowForm(true)
  }

  const handleRemove = (id: string) => {
    onChange(resources.filter(r => r.id !== id).map((r, i) => ({ ...r, order: i })))
  }

  const handleToggleComplete = (id: string) => {
    onChange(resources.map(r =>
      r.id === id ? { ...r, completed: !r.completed } : r
    ))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const completedCount = resources.filter(r => r.completed).length

  const sorted = [...resources].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.order - b.order
  })

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3>Resources & References</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {completedCount} of {resources.length} completed
          </span>
        </div>
        {isOwner && !showForm && (
          <button onClick={() => setShowForm(true)} className={styles.addResourceBtn}>
            + Add Resource
          </button>
        )}
      </div>

      {resources.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${resources.length > 0 ? (completedCount / resources.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
            {resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0}%
          </span>
        </div>
      )}

      {showForm && (
        <div className={styles.resourceForm}>
          <div className={styles.formRow}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Resource title *"
              className={styles.formInput}
              autoFocus
            />
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as ResourceType)}
              className={styles.formSelect}
            >
              {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{RESOURCE_TYPE_ICONS[key as ResourceType]} {label}</option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="URL (https://...)"
              className={styles.formInput}
            />
          </div>
          <div className={styles.formRow}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className={styles.formTextarea}
              rows={2}
            />
          </div>
          <div className={styles.formActions}>
            <button onClick={resetForm} className={styles.cancelBtn}>Cancel</button>
            <button onClick={handleSubmit} disabled={!title.trim()} className={styles.saveBtn}>
              {editingId ? 'Update' : 'Add Resource'}
            </button>
          </div>
        </div>
      )}

      {!showForm && resources.length === 0 && (
        <EmptyState icon="📚" title="No resources yet" description="Add links, documents, checklists, or references to help plan your project." action={isOwner ? { label: 'Add Resource', onClick: () => setShowForm(true) } : undefined} />
      )}

      <div className={styles.resourceList}>
        {sorted.map((resource) => (
          <div
            key={resource.id}
            className={`${styles.resourceCard} ${resource.completed ? styles.completed : ''}`}
          >
            <div className={styles.resourceCheck}>
              <input
                type="checkbox"
                checked={resource.completed}
                onChange={() => handleToggleComplete(resource.id)}
                disabled={!isOwner}
              />
            </div>
            <div className={styles.resourceIcon}>
              {RESOURCE_TYPE_ICONS[resource.type]}
            </div>
            <div className={styles.resourceBody}>
              <div className={styles.resourceTitle}>
                {resource.url ? (
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    {resource.title}
                  </a>
                ) : (
                  <span>{resource.title}</span>
                )}
                <span className={styles.resourceTypeBadge}>
                  {RESOURCE_TYPE_LABELS[resource.type]}
                </span>
              </div>
              {resource.description && (
                <div className={styles.resourceDescription}>{resource.description}</div>
              )}
            </div>
            {isOwner && (
              <div className={styles.resourceActions}>
                <button onClick={() => handleEdit(resource)} className={styles.editBtn} title="Edit">✎</button>
                <button onClick={() => handleRemove(resource.id)} className={styles.deleteBtn} title="Remove">✕</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
