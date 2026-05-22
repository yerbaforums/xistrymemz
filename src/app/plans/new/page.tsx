'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

export default function NewPlanPage() {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goals, setGoals] = useState('')
  const [mileposts, setMileposts] = useState('')
  const [lookingForCollaborators, setLookingForCollaborators] = useState(false)
  const [saving, setSaving] = useState(false)
  const [quickTemplate, setQuickTemplate] = useState('')

  const TEMPLATES = [
    { id: 'community-garden', icon: '🌱', name: 'Community Garden', description: 'Start a community garden project with planning, planting, and harvest milestones', sampleTitle: 'Community Garden Project', sampleDesc: 'Building a sustainable community garden for fresh produce and neighborhood connection.', sampleGoals: 'Secure land and permits\nOrganize planting schedule\nRecruit volunteers\nHarvest and distribute', sampleMileposts: 'Site selection & prep\nSeed planting\nWeekly maintenance\nFirst harvest' },
    { id: 'bike-repair', icon: '🔧', name: 'Bike Repair Workshop', description: 'Set up a community bike repair shop with tool inventory and service plans', sampleTitle: 'Bike Repair Collective', sampleDesc: 'A community-run bike repair workshop offering tools, space, and know-how.', sampleGoals: 'Gather tools and parts\nSet up workspace\nCreate repair schedule\nOffer classes', sampleMileposts: 'Tool collection\nWorkshop setup\nFirst repair day\nMonthly classes' },
    { id: 'neighborhood-watch', icon: '👁️', name: 'Neighborhood Watch', description: 'Organize neighborhood safety with check-in routes, alerts, and team coordination', sampleTitle: 'Neighborhood Safety Network', sampleDesc: 'Keeping our neighborhood safe through community watch, alerts, and quick response.', sampleGoals: 'Recruit block captains\nEstablish communication\nSet up patrol routes\nEmergency plan', sampleMileposts: 'Captain recruitment\nCommunication setup\nFirst patrol\nEmergency drill' },
    { id: 'free-library', icon: '📚', name: 'Free Little Library', description: 'Create a free book exchange with multiple locations and community reading events', sampleTitle: 'Little Free Library Network', sampleDesc: 'Building little free libraries across the neighborhood for book sharing.', sampleGoals: 'Build library boxes\nFind host locations\nStock with books\nHost reading events', sampleMileposts: 'Box construction\nLocation setup\nBook drive\nFirst story time' },
    { id: 'tool-lending', icon: '🛠️', name: 'Tool Lending Library', description: 'Start a tool sharing program where neighbors borrow and lend equipment', sampleTitle: 'Neighborhood Tool Library', sampleDesc: 'Borrow and lend tools with your neighbors. From lawn mowers to power drills.', sampleGoals: 'Inventory tools\nSet up checkout system\nRecruit members\nMaintain tools', sampleMileposts: 'Tool inventory\nCheckout system\nMember drive\nMaintenance day' },
    { id: 'custom', icon: '✏️', name: 'Custom Project', description: 'Start from scratch with your own project idea', sampleTitle: '', sampleDesc: '', sampleGoals: '', sampleMileposts: '' },
  ]

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setQuickTemplate(tpl.id)
    setTitle(tpl.sampleTitle)
    setDescription(tpl.sampleDesc)
    setGoals(tpl.sampleGoals)
    setMileposts(tpl.sampleMileposts)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, goals, mileposts, lookingForCollaborators,
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }
      const data = await res.json()
      success('Project created!')
      router.push(`/plans/${data.id}`)
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/projects" className={styles.backLink}>← Back to Projects</Link>
        <h1>New Project</h1>
        <p>Start with a template or create from scratch</p>
      </div>

      {!quickTemplate && (
        <div className={styles.templateGrid}>
          {TEMPLATES.map(tpl => (
            <button key={tpl.id} className={styles.templateCard} onClick={() => applyTemplate(tpl)}>
              <span className={styles.templateIcon}>{tpl.icon}</span>
              <strong className={styles.templateName}>{tpl.name}</strong>
              <span className={styles.templateDesc}>{tpl.description}</span>
            </button>
          ))}
        </div>
      )}

      {quickTemplate && (
        <div className={styles.form}>
          {quickTemplate !== 'custom' && (
            <div className={styles.banner}>
              <span>{TEMPLATES.find(t => t.id === quickTemplate)?.icon}</span>
              <span>{TEMPLATES.find(t => t.id === quickTemplate)?.name} template applied</span>
              <button className={styles.changeBtn} onClick={() => { setQuickTemplate(''); setTitle(''); setDescription(''); setGoals(''); setMileposts('') }}>
                Change
              </button>
            </div>
          )}

          <div className={styles.field}>
            <label>Project Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Name your project" />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" rows={3} />
          </div>

          <div className={styles.field}>
            <label>Goals (one per line)</label>
            <textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="What do you want to achieve?" rows={4} />
          </div>

          <div className={styles.field}>
            <label>Milestones (one per line)</label>
            <textarea value={mileposts} onChange={e => setMileposts(e.target.value)} placeholder="Key milestones or phases" rows={4} />
          </div>

          <label className={styles.checkField}>
            <input type="checkbox" checked={lookingForCollaborators} onChange={e => setLookingForCollaborators(e.target.checked)} />
            <span>Looking for collaborators</span>
          </label>

          <div className={styles.actions}>
            <button className={styles.createBtn} onClick={handleCreate} disabled={saving || !title.trim()}>
              {saving ? 'Creating...' : 'Create Project →'}
            </button>
            <Link href="/dashboard/projects" className={styles.cancelBtn}>Cancel</Link>
          </div>
        </div>
      )}
    </div>
  )
}
