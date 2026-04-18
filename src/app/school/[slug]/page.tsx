'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from './page.module.css'

interface SchoolData {
  schoolName: string
  schoolAbout: string | null
  schoolImage: string | null
  user: { name: string | null; id: string }
}

interface Content {
  id: string
  title: string
  content: string
  contentType: string
  author: { name: string | null }
  user: { schoolName: string | null; schoolSlug: string | null } | null
  originalContent: {
    title: string
    content: string
    contentType: string
    author: { name: string | null }
    user: { schoolName: string | null; schoolSlug: string | null } | null
  } | null
  createdAt: string
}

export default function SchoolPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBrowseModal, setShowBrowseModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [contentType, setContentType] = useState('article')
  const [creating, setCreating] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [filterType, setFilterType] = useState('all')
  const [availableContent, setAvailableContent] = useState<Content[]>([])
  const [browsing, setBrowsing] = useState(false)

  useEffect(() => {
    if (!slug) return

    fetch(`/api/school/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('School not found')
        return res.json()
      })
      .then(data => {
        setSchool(data)
        return fetch(`/api/school/${slug}/content`)
      })
      .then(res => res.json())
      .then(data => {
        setContents(data)
        setLoading(false)
      })
      .catch(() => {
        setError('School not found')
        setLoading(false)
      })
  }, [slug])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch(`/api/school/${slug}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, contentType })
      })

      if (res.ok) {
        const newContentItem = await res.json()
        setContents([{ ...newContentItem, author: { name: school?.user.name }, user: null, originalContent: null }, ...contents])
        setShowCreateModal(false)
        setNewTitle('')
        setNewContent('')
      }
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleBrowseContent = async () => {
    setBrowsing(true)
    try {
      const res = await fetch('/api/schools')
      const schools = await res.json()
      const allContent: Content[] = []
      
      for (const s of schools) {
        if (s.schoolSlug === slug) continue
        const contentRes = await fetch(`/api/school/${s.schoolSlug}/content`)
        const contentData = await contentRes.json()
        allContent.push(...contentData.map((c: Content) => ({
          ...c,
          user: { schoolName: s.schoolName, schoolSlug: s.schoolSlug }
        })))
      }
      
      setAvailableContent(allContent)
    } catch (error) {
      console.error('Failed to browse:', error)
    } finally {
      setBrowsing(false)
    }
  }

  const handleRepost = async (content: Content) => {
    setCreating(true)
    try {
      const res = await fetch(`/api/school/${slug}/content/${content.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.ok) {
        const newContentItem = await res.json()
        setContents([newContentItem, ...contents])
        setShowBrowseModal(false)
      }
    } catch (error) {
      console.error('Failed to repost:', error)
    } finally {
      setCreating(false)
    }
  }

  const filteredContents = filterType === 'all' 
    ? contents 
    : contents.filter(c => c.contentType === filterType)

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (error) return <div className={styles.error}>{error}</div>
  if (!school) return <div className={styles.error}>School not found</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {school.schoolImage && (
          <img src={school.schoolImage} alt={school.schoolName} className={styles.schoolImage} />
        )}
        <div className={styles.schoolInfo}>
          <h1>{school.schoolName}</h1>
          {school.schoolAbout && <p className={styles.about}>{school.schoolAbout}</p>}
          <p className={styles.owner}>by {school.user.name || 'Unknown'}</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={() => setShowCreateModal(true)} className={styles.createBtn}>
          + Create Content
        </button>
        <button onClick={() => { handleBrowseContent(); setShowBrowseModal(true); }} className={styles.browseBtn}>
          + Browse & Repost
        </button>
      </div>

      <div className={styles.filters}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="article">Articles</option>
          <option value="lesson">Lessons</option>
          <option value="note">Notes</option>
          <option value="guide">Guides</option>
        </select>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.contentList}>
          <h2>Wiki Content ({filteredContents.length})</h2>
          {filteredContents.length === 0 ? (
            <p className={styles.empty}>No content yet. Be the first to add!</p>
          ) : (
            filteredContents.map(item => (
              <div 
                key={item.id} 
                className={`${styles.contentCard} ${selectedContent?.id === item.id ? styles.selected : ''}`}
                onClick={() => setSelectedContent(item)}
              >
                {item.originalContent && (
                  <span className={styles.repostBadge}>🔄 Reposted</span>
                )}
                <span className={`badge badge-${item.contentType}`}>{item.contentType}</span>
                <h3>{item.title}</h3>
                <p className={styles.meta}>
                  by {item.author.name} 
                  {item.user?.schoolSlug && <> from <Link href={`/school/${item.user.schoolSlug}`}>{item.user.schoolName}</Link></>}
                  • {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        <div className={styles.contentView}>
          {selectedContent ? (
            <div className={styles.contentDetail}>
              {selectedContent.originalContent && (
                <div className={styles.originalContent}>
                  <p>🔄 Reposted from <Link href={`/school/${selectedContent.originalContent.user?.schoolSlug}`}>{selectedContent.originalContent.user?.schoolName}</Link> by {selectedContent.originalContent.author.name}</p>
                </div>
              )}
              <span className={`badge badge-${selectedContent.contentType}`}>{selectedContent.contentType}</span>
              <h2>{selectedContent.title}</h2>
              <p className={styles.meta}>
                by {selectedContent.author.name} 
                {selectedContent.user?.schoolSlug && <> from <Link href={`/school/${selectedContent.user.schoolSlug}`}>{selectedContent.user.schoolName}</Link></>}
                • {new Date(selectedContent.createdAt).toLocaleDateString()}
              </p>
              <div className={styles.contentBody}>
                {selectedContent.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.placeholder}>
              <p>Select content to view</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Wiki Content</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Content title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Content Type</label>
                <select value={contentType} onChange={e => setContentType(e.target.value)}>
                  <option value="article">Article</option>
                  <option value="lesson">Lesson</option>
                  <option value="note">Note</option>
                  <option value="guide">Guide</option>
                </select>
              </div>
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Write your content here..."
                  rows={10}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBrowseModal && (
        <div className="modal-overlay" onClick={() => setShowBrowseModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2>Browse Content from Other Schools</h2>
            {browsing ? (
              <p>Loading...</p>
            ) : availableContent.length === 0 ? (
              <p className={styles.empty}>No content available from other schools</p>
            ) : (
              <div className={styles.browseList}>
                {availableContent.map(item => (
                  <div key={item.id} className={styles.browseCard}>
                    <div className={styles.browseInfo}>
                      <span className={`badge badge-${item.contentType}`}>{item.contentType}</span>
                      <h3>{item.title}</h3>
                      <p className={styles.meta}>
                        by {item.author.name} from <Link href={`/school/${item.user?.schoolSlug}`}>{item.user?.schoolName}</Link>
                      </p>
                      <p className={styles.contentPreview}>
                        {item.content.substring(0, 150)}...
                      </p>
                    </div>
                    <button onClick={() => handleRepost(item)} className="btn-primary">
                      Repost
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowBrowseModal(false)} className="btn-ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
