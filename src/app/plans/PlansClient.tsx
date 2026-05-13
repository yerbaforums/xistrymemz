'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { stringifyGoals, stringifyMilestones } from '@/lib/plan-utils'

interface Plan {
  id: string
  title: string
  description: string | null
  status: string
  published: boolean
  pinned: boolean
  createdAt: string
  updatedAt: string
  progress?: number
  completedRequests?: number
  _count: {
    requests: number
    joiners?: number
  }
}

interface PlansClientProps {
  initialPlans: Plan[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived'
}

const STATUS_ICONS: Record<string, string> = {
  DRAFT: '📝',
  ACTIVE: '🚀',
  COMPLETED: '✅',
  ARCHIVED: '📦'
}

export default function PlansClient({ initialPlans }: PlansClientProps) {
  const [plans, setPlans] = useState(initialPlans)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState('')
  const [mileposts, setMileposts] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filteredPlans = plans.filter(p => {
    const matchesFilter = filter === 'ALL' || p.status === filter
    const matchesSearch = !search || 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description?.toLowerCase().includes(search.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const goalItems = goals
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map((text, i) => ({ id: `cg_${i}`, text, order: i, status: 'active' as const }))

    const milestoneItems = mileposts
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map((title, i) => ({ id: `cm_${i}`, title, order: i, completed: false }))

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          goals: stringifyGoals(goalItems),
          mileposts: stringifyMilestones(milestoneItems)
        })
      })

      if (res.ok) {
        const newPlan = await res.json()
        setPlans([{ ...newPlan, _count: { requests: 0 } }, ...plans])
        setShowModal(false)
        setTitle('')
        setDescription('')
        setGoals('')
        setMileposts('')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlans(plans.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to Dashboard
      </Link>

      <div className={styles.header}>
        <div>
          <h1>My Projects</h1>
          <p className={styles.subtitle}>Track your goals, collaborate, and get things done</p>
        </div>
        <Link href="/plans/public" className={styles.createBtn} style={{ marginRight: '8px', textDecoration: 'none' }}>
          🌍 Explore Projects
        </Link>
        <button onClick={() => setShowModal(true)} className={styles.createBtn}>
          + New Project
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterButtons}>
          {['ALL', 'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
            >
              {STATUS_ICONS[f] || ''} {STATUS_LABELS[f] || f}
            </button>
          ))}
        </div>
      </div>

      {filteredPlans.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🚀</div>
          <p>No projects found</p>
          <span>Create your first project to get started</span>
          <Link href="/plans" className="btn-primary" style={{ marginTop: '16px' }}>
            Create Project
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredPlans.map(plan => (
            <div key={plan.id} className={`${styles.card} ${plan.pinned ? styles.pinnedCard : ''}`}>
              {plan.pinned && <div className={styles.pinnedBanner}>📌 Pinned</div>}
              <div className={styles.cardHeader}>
                <span className={`${styles.statusBadge} ${styles[plan.status.toLowerCase()]}`}>
                  {STATUS_ICONS[plan.status]} {STATUS_LABELS[plan.status]}
                </span>
                {plan.published && (
                  <span className={styles.publicBadge}>🌐 Public</span>
                )}
              </div>
              
              <Link href={`/plans/${plan.id}`} className={styles.cardTitle}>
                {plan.title}
              </Link>
              
              {plan.progress !== undefined && (
                <div className={styles.progressBar}>
                  <div className={styles.progressTrack}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                  <span className={styles.progressLabel}>
                    {plan.completedRequests || 0}/{plan._count.requests} completed ({plan.progress}%)
                  </span>
                </div>
              )}
              
              {plan.description && (
                <p className={styles.cardDesc}>{plan.description}</p>
              )}
              
              <div className={styles.cardFooter}>
                <div className={styles.cardMeta}>
                  <span>📋 {plan._count.requests} request{plan._count.requests !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
                <div className={styles.cardActions}>
                  <Link href={`/plans/${plan.id}`} className={styles.actionBtn}>
                    View
                  </Link>
                  {plan.published && (
                    <a 
                      href={`/plans/public?id=${plan.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.previewBtn}
                    >
                      Preview
                    </a>
                  )}
                  <button 
                    onClick={() => handleDelete(plan.id)} 
                    className={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <p className={styles.modalSubtitle}>Set your goal and break it down into achievable steps</p>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Launch my online store"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this project about? What outcome are you looking for?"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Goals (one per line)</label>
                <textarea
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  placeholder="What do you want to achieve?&#10;- Generate $1000 in revenue&#10;- Get 100 customers&#10;- Launch website"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Milestones / Timeline</label>
                <textarea
                  value={mileposts}
                  onChange={e => setMileposts(e.target.value)}
                  placeholder="Key milestones and timeline&#10;- Week 1: Set up business&#10;- Month 1: Launch MVP&#10;- Month 3: First sale"
                  rows={4}
                />
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
