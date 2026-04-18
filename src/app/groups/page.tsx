'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  user: { id: string; name: string | null; image: string | null }
  _count: { members: number; posts: number }
  members?: { id: string; role: string; userId: string }[]
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [search, setSearch] = useState('')
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [creating, setCreating] = useState(false)

  const filteredGroups = groups.filter(g => {
    const matchesSearch = !search || 
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description?.toLowerCase().includes(search.toLowerCase()))
    return matchesSearch
  })

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user?.id) setUserId(data.user.id)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = filter === 'my' ? '/api/groups?my=true' : '/api/groups'
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setGroups(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setCreating(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isPrivate })
      })
      
      if (res.ok) {
        const newGroup = await res.json()
        setGroups([newGroup, ...groups])
        setShowModal(false)
        setName('')
        setDescription('')
        setIsPrivate(false)
      }
    } catch (error) {
      console.error('Failed to create group:', error)
    } finally {
      setCreating(false)
    }
  }

  const isMember = (group: Group) => {
    return group.members?.some(m => m.userId === userId) || false
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Groups</h1>
          <p className={styles.subtitle}>Create and join groups to connect with community members</p>
        </div>
        {userId && (
          <button onClick={() => setShowModal(true)} className={styles.createBtn}>
            + Create Group
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterButtons}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All Groups
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'my' ? styles.active : ''}`}
            onClick={() => setFilter('my')}
          >
            My Groups
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading groups...</div>
      ) : filteredGroups.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>👥</div>
          <h3>No groups found</h3>
          <p>{filter === 'my' ? "You haven't joined any groups yet" : "Be the first to create a group!"}</p>
          {filter === 'all' && userId && (
            <button onClick={() => setShowModal(true)} className={styles.createBtn}>
              Create Group
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredGroups.map(group => (
            <Link href={`/groups/${group.id}`} key={group.id} className={styles.card}>
              <div className={styles.cardImage}>
                {group.imageUrl ? (
                  <img src={group.imageUrl} alt={group.name} />
                ) : (
                  <div className={styles.placeholderIcon}>👥</div>
                )}
              </div>
              <div className={styles.cardContent}>
                <h3>{group.name}</h3>
                {group.description && (
                  <p className={styles.cardDesc}>{group.description}</p>
                )}
                <div className={styles.cardMeta}>
                  <span>👥 {group._count.members} members</span>
                  <span>📝 {group._count.posts} posts</span>
                </div>
                {group.isPrivate && <span className={styles.privateBadge}>🔒 Private</span>}
              </div>
              {userId && !isMember(group) && (
                <div className={styles.joinHint}>Click to join</div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Group</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this group about?"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                  />
                  Private Group (invite only)
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating || !name.trim()}>
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
