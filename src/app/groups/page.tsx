'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import AlphabeticalIndex, { type IndexItem } from '@/components/AlphabeticalIndex'
import { GROUP_CATEGORIES } from '@/lib/shop-categories'
import Skeleton, { SkeletonCard, SkeletonList } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import HashtagInput from '@/components/HashtagInput'

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  category: string | null
  user: { id: string; name: string | null; image: string | null }
  _count: { members: number; posts: number }
  members?: { id: string; role: string; userId: string }[]
}

const catMap = new Map(GROUP_CATEGORIES.map(c => [c.value, c]))

export default function GroupsPage() {
  const { error, success } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [search, setSearch] = useState('')
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [isPrivate, setIsPrivate] = useState(false)
  const [groupHashtags, setGroupHashtags] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const filteredGroups = useMemo(() => groups.filter(g => {
    const matchesSearch = !search || 
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description?.toLowerCase().includes(search.toLowerCase()))
    return matchesSearch
  }), [groups, search])

  const indexItems: IndexItem[] = useMemo(() =>
    filteredGroups.map(g => ({
      id: g.id,
      label: g.name,
      category: g.category || 'GENERAL'
    })),
    [filteredGroups]
  )

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch session')
        return res.json()
      })
      .then(data => {
        if (data?.user?.id) setUserId(data.user.id)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = filter === 'my' ? '/api/groups?my=true' : '/api/groups'
    fetch(url)
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({ error: 'Failed to fetch groups' })).then(data => {
            throw new Error(data.error || 'Request failed')
          })
        }
        return res.json()
      })
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
        body: JSON.stringify({ name, description, category, privacy: isPrivate ? 'PRIVATE' : 'PUBLIC', hashtags: groupHashtags })
      })
      
      if (res.ok) {
        const newGroup = await res.json()
        setGroups([newGroup, ...groups])
        setShowModal(false)
        setName('')
        setDescription('')
        setCategory('GENERAL')
        setIsPrivate(false)
        setGroupHashtags([])
        success('Group created!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to create group')
      }
    } catch (err) {
      console.error('Failed to create group:', err)
      error('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const isMember = (group: Group) => {
    return group.members?.some(m => m.userId === userId) || false
  }

  const renderCard = useCallback((item: IndexItem) => {
    const group = groups.find(g => g.id === item.id)
    if (!group) return null
    const cat = catMap.get(group.category || 'GENERAL')
    return (
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
          {cat && <span className={styles.categoryBadge}>{cat.icon} {cat.label}</span>}
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
    )
  }, [groups, userId])

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
        <SkeletonList count={3} />
      ) : filteredGroups.length === 0 ? (
        <EmptyState icon="👥" title="No groups found" description={filter === 'my' ? "You haven't joined any groups yet" : "Be the first to create a group!"} />
      ) : (
        <AlphabeticalIndex
          items={indexItems}
          renderCard={renderCard}
          groupBy={item => {
            const cat = catMap.get(item.category || 'GENERAL')
            return cat ? `${cat.icon} ${cat.label}` : 'General'
          }}
          sidebarTitle="Browse by Category"
        />
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
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {GROUP_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
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
              <div className="form-group">
                <label>Hashtags</label>
                <HashtagInput value={groupHashtags} onChange={setGroupHashtags} placeholder="Add hashtags..." />
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
