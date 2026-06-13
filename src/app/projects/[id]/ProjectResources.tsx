'use client'

import { useState, useCallback } from 'react'
import styles from './resources.module.css'
import { EmptyState } from '@/components/EmptyState'
import ImageUploader from '@/components/ImageUploader'
import ProjectSortableList from './ProjectSortableList'
import type { ProjectResource, ResourceType } from '@/lib/project-utils'

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

interface ProjectResourcesProps {
  resources: ProjectResource[]
  isOwner: boolean
  onChange: (resources: ProjectResource[]) => void
}

export default function ProjectResources({ resources, isOwner, onChange }: ProjectResourcesProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType>('LINK')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!title.trim()) return
    const resourceUrl = resourceType === 'FILE' ? (fileUrl || url) : url.trim()
    const resourceFileUrl = resourceType === 'FILE' ? (fileUrl || null) : null
    if (editingId) {
      onChange(resources.map(r =>
        r.id === editingId
          ? { ...r, title: title.trim(), url: resourceUrl, type: resourceType, description: description.trim(), fileUrl: resourceFileUrl }
          : r
      ))
    } else {
      const newResource: ProjectResource = {
        id: `r_${Date.now()}`,
        title: title.trim(),
        url: resourceUrl,
        type: resourceType,
        description: description.trim(),
        order: resources.length,
        completed: false,
        fileUrl: resourceFileUrl,
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
    setFileUrl('')
    setUploadedImages([])
  }

  const handleEdit = (r: ProjectResource) => {
    setEditingId(r.id)
    setTitle(r.title)
    setUrl(r.url || '')
    setResourceType(r.type)
    setDescription(r.description || '')
    setFileUrl(r.fileUrl || '')
    setUploadedImages(r.fileUrl ? [r.fileUrl] : [])
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

  const handleReorder = useCallback((reordered: ProjectResource[]) => {
    onChange(reordered)
  }, [onChange])

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
          <span className={styles.goalsSummary}>
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
        <div className={styles.progressRow}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${resources.length > 0 ? (completedCount / resources.length) * 100 : 0}%` }} />
          </div>
          <span className={styles.progressPct}>
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
          {resourceType === 'FILE' ? (
            <div className={styles.formRow}>
              <ImageUploader images={uploadedImages} onChange={(imgs) => { setUploadedImages(imgs); setFileUrl(imgs[0] || '') }} maxImages={1} />
            </div>
          ) : (
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
          )}
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

      <ProjectSortableList items={sorted} onChange={handleReorder} renderItem={(resource, index, handlers) => (
        <div
          key={resource.id}
          className={`${styles.resourceCard} ${resource.completed ? styles.completed : ''} ${handlers.isDragging ? styles.dragging : ''} ${handlers.isDragOver ? styles.dragOver : ''}`}
          draggable={isOwner}
          onDragStart={(e) => handlers.handleDragStart(e, index)}
          onDragOver={(e) => handlers.handleDragOver(e, index)}
          onDragLeave={handlers.handleDragLeave}
          onDrop={(e) => handlers.handleDrop(e, index)}
        >
          {isOwner && <span className={styles.dragHandle} title="Drag to reorder">⠿</span>}
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
              {resource.fileUrl ? (
                <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer" download>
                  {resource.title} 📎
                </a>
              ) : resource.url ? (
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
      )} />
    </div>
  )
}
