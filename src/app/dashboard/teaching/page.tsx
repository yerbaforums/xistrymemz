'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'
import styles from './teaching.module.css'

interface SchoolInfo {
  schoolName: string | null
  schoolAbout: string | null
  schoolImage: string | null
  schoolSlug: string | null
}

interface ContentItem {
  id: string
  title: string
  contentType: string
  price: number
  isPaid: boolean
  createdAt: string
}

interface Student {
  userId: string
  user: { name: string | null; email: string }
  type: string
  createdAt: string
}

export default function TeachingPage() {
  const { success, error } = useToast()
  const [school, setSchool] = useState<SchoolInfo | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subscribers, setSubscribers] = useState<{ id: string; subscriber: { name: string | null; email: string }; tier: string; price: number; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [showContentForm, setShowContentForm] = useState(false)
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [schoolForm, setSchoolForm] = useState({ schoolName: '', schoolAbout: '', schoolImage: '', schoolSlug: '' })
  const [contentForm, setContentForm] = useState({ title: '', content: '', contentType: 'article', price: '', isPaid: false })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [schoolRes, contentRes, purchasesRes] = await Promise.all([
        fetch('/api/school'),
        fetch('/api/my-products'),
        fetch('/api/school/purchases'),
      ])
      const schoolData = await schoolRes.json()
      const contentData = await contentRes.json()
      const purchasesData = await purchasesRes.json()

      setSchool(schoolData)
      setSchoolForm({
        schoolName: schoolData.schoolName || '',
        schoolAbout: schoolData.schoolAbout || '',
        schoolImage: schoolData.schoolImage || '',
        schoolSlug: schoolData.schoolSlug || '',
      })
      setContent(Array.isArray(contentData) ? contentData : contentData?.content || [])
      setStudents(purchasesData?.purchases || [])
      setSubscribers(purchasesData?.subscriptions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schoolForm)
      })
      if (res.ok) { success('School saved!'); fetchAll(); setShowSchoolForm(false) }
      else { const err = await res.json(); error(err.error || 'Failed') }
    } catch { error('Failed') }
    finally { setSaving(false) }
  }

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingContent ? `/api/school/content/${editingContent.id}` : '/api/school/content'
      const method = editingContent ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contentForm, price: contentForm.price ? parseFloat(contentForm.price) : 0 })
      })
      if (res.ok) { success(editingContent ? 'Content updated!' : 'Content created!'); fetchAll(); setShowContentForm(false); setEditingContent(null) }
      else { const err = await res.json(); error(err.error || 'Failed') }
    } catch { error('Failed') }
    finally { setSaving(false) }
  }

  const handleDeleteContent = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      const res = await fetch(`/api/school/content/${id}`, { method: 'DELETE' })
      if (res.ok) { success('Deleted'); fetchAll() }
      else error('Failed')
    } catch { error('Failed') }
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Teaching' }]} />
      <div className={styles.header}>
        <div>
          <h1>🏫 Teaching</h1>
          <p className={styles.welcome}>Manage your courses, content, and students</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setShowSchoolForm(true)} className="btn-secondary">⚙️ School Settings</button>
          <button onClick={() => { setEditingContent(null); setContentForm({ title: '', content: '', contentType: 'article', price: '', isPaid: false }); setShowContentForm(true) }} className="btn-primary">➕ New Content</button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{content.length}</span>
          <span className={styles.statLbl}>Lessons</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{students.length}</span>
          <span className={styles.statLbl}>Students</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{subscribers.length}</span>
          <span className={styles.statLbl}>Subscribers</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{school?.schoolSlug ? '✓' : '✕'}</span>
          <span className={styles.statLbl}>School Active</span>
        </div>
      </div>

      {/* School Card */}
      {school?.schoolName ? (
        <div className={styles.schoolCard}>
          <div className={styles.schoolInfo}>
            <h3>{school.schoolName}</h3>
            <p>{school.schoolAbout || 'No description'}</p>
            {school.schoolSlug && (
              <Link href={`/school/${school.schoolSlug}`} className={styles.viewSchool}>View School →</Link>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.prompt}>
          <h3>Set up your school to start teaching</h3>
          <p>Create courses, share knowledge, and earn from your expertise.</p>
          <Link href="/school/setup" className="btn-primary">Create School</Link>
        </div>
      )}

      {/* Content List */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>📚 Your Content ({content.length})</h3>
        </div>
        {content.length === 0 ? (
          <div className={styles.empty}>
            <p>No content yet. Create your first lesson!</p>
          </div>
        ) : (
          <div className={styles.contentList}>
            {content.map(c => (
              <div key={c.id} className={styles.contentItem}>
                <div className={styles.contentInfo}>
                  <span className={`${styles.contentType} ${styles[c.contentType as keyof typeof styles] || ''}`}>
                    {c.contentType}
                  </span>
                  <strong>{c.title}</strong>
                  {c.isPaid && <span className={styles.price}>${c.price}</span>}
                </div>
                <div className={styles.contentActions}>
                  <button onClick={() => {
                    setEditingContent(c)
                    setContentForm({ title: c.title, content: '', contentType: c.contentType, price: c.price.toString(), isPaid: c.isPaid })
                    setShowContentForm(true)
                  }} className={styles.smallBtn}>✏️</button>
                  <button onClick={() => handleDeleteContent(c.id, c.title)} className={styles.smallBtnDanger}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students */}
      {students.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>👥 Recent Students</h3>
          </div>
          <div className={styles.studentList}>
            {students.slice(0, 5).map(s => (
              <div key={s.userId} className={styles.studentItem}>
                <span>{s.user.name || s.user.email}</span>
                <span className={styles.meta}>{s.type} • {new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* School Settings Modal */}
      {showSchoolForm && (
        <div className="modal-overlay" onClick={() => setShowSchoolForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚙️ School Settings</h2>
            <form onSubmit={handleSchoolSubmit}>
              <div className="form-group">
                <label>School Name</label>
                <input type="text" value={schoolForm.schoolName} onChange={e => setSchoolForm({...schoolForm, schoolName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>About</label>
                <textarea value={schoolForm.schoolAbout} onChange={e => setSchoolForm({...schoolForm, schoolAbout: e.target.value})} rows={3} />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input type="text" value={schoolForm.schoolImage} onChange={e => setSchoolForm({...schoolForm, schoolImage: e.target.value})} />
              </div>
              <div className="form-group">
                <label>URL Slug</label>
                <input type="text" value={schoolForm.schoolSlug} onChange={e => setSchoolForm({...schoolForm, schoolSlug: e.target.value})} />
                <small style={{color: 'var(--text-secondary)'}}>xistrymemz.com/school/{schoolForm.schoolSlug || 'your-slug'}</small>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowSchoolForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content Form Modal */}
      {showContentForm && (
        <div className="modal-overlay" onClick={() => { setShowContentForm(false); setEditingContent(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingContent ? '✏️ Edit Content' : '➕ New Content'}</h2>
            <form onSubmit={handleContentSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={contentForm.title} onChange={e => setContentForm({...contentForm, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={contentForm.contentType} onChange={e => setContentForm({...contentForm, contentType: e.target.value})}>
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="course">Course</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="guide">Guide</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price</label>
                <input type="number" value={contentForm.price} onChange={e => setContentForm({...contentForm, price: e.target.value})} step="0.01" />
                <label className={styles.checkLabel} style={{marginTop: 8}}>
                  <input type="checkbox" checked={contentForm.isPaid} onChange={e => setContentForm({...contentForm, isPaid: e.target.checked})} />
                  Paid content
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => { setShowContentForm(false); setEditingContent(null) }} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingContent ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
