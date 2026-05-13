'use client'

import { useState, useCallback, type ReactNode } from 'react'
import styles from './sortable.module.css'

export interface SortableItem {
  id: string
}

interface PlanSortableListProps<T extends SortableItem> {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, index: number, handlers: {
    handleDragStart: (e: React.DragEvent, idx: number) => void
    handleDragOver: (e: React.DragEvent, idx: number) => void
    handleDragLeave: (e: React.DragEvent) => void
    handleDrop: (e: React.DragEvent, idx: number) => void
    isDragOver: boolean
    isDragging: boolean
  }) => ReactNode
}

export default function PlanSortableList<T extends SortableItem>({
  items,
  onChange,
  renderItem
}: PlanSortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    setDragIndex(idx)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(idx)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    const dragIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(dragIdx) || dragIdx === dropIdx) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const updated = [...items]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(dropIdx, 0, moved)
    const reindexed = updated.map((item, i) => ({ ...item, order: i }))
    onChange(reindexed)
    setDragIndex(null)
    setDragOverIndex(null)
  }, [items, onChange])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  return (
    <div onDragEnd={handleDragEnd} className={styles.sortableList}>
      {items.map((item, index) =>
        renderItem(item, index, {
          handleDragStart,
          handleDragOver,
          handleDragLeave,
          handleDrop,
          isDragOver: dragOverIndex === index,
          isDragging: dragIndex === index
        })
      )}
    </div>
  )
}
