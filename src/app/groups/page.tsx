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
import Button from '@/components/ui/Button'
import Breadcrumbs from '@/components/Breadcrumbs'
import LocationOption from '@/components/LocationOption'
import { MapContainer, TileLayer, Marker, Popup } from '@/components/LeafletComponents'

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  category: string | null
  user: { id: string; name: string | null; image: string | null }
  _count: { members: number; posts: number }
  location: string | null
  latitude: number | null
  longitude: number | null
  isLocationBased: boolean
  members?: { id: string; role: string; userId: string }[]
}

const catMap = new Map(GROUP_CATEGORIES.map(c => [c.value, c]))

// Note: view toggle is not needed here because AlphabeticalIndex handles its own display layout
export default function GroupsPage() {
  const { error, success } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalGroups, setTotalGroups] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent')
  const PAGE_SIZE = 20
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [isPrivate, setIsPrivate] = useState(false)
  const [groupHashtags, setGroupHashtags] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const filteredGroups = useMemo(() => {
    let result = groups.filter(g => {
      const matchesSearch = !search || 
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description?.toLowerCase().includes(search.toLowerCase()))
      return matchesSearch
    })
    if (sortBy === 'alpha') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }
    return result
  }, [groups, search, sortBy])

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

  const fetchGroups = async (pageNum: number, append: boolean) => {
    const myParam = filter === 'my' ? '&my=true' : ''
    const res = await fetch(`/api/groups?page=${pageNum}&pageSize=${PAGE_SIZE}${myParam}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    const items = data.items || data || []
    setGroups(prev => append ? [...prev, ...items] : items)
    setTotalGroups(data.total || 0)
    setPage(pageNum)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchGroups(1, false)
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
        setGroups(prev => [newGroup, ...prev])
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
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Groups' },
      ]} />
      <div className={styles.header}>
        <div>
          <h1>Groups</h1>
          <p className={styles.subtitle}>Create and join groups to connect with community members</p>
        </div>
        {userId && (
          <Button onClick={() => setShowModal(true)} className={styles.createBtn}>
            + Create Group
          </Button>
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
          <Button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All Groups
          </Button>
          <Button 
            className={`${styles.filterBtn} ${filter === 'my' ? styles.active : ''}`}
            onClick={() => setFilter('my')}
          >
            My Groups
          </Button>
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'recent' | 'alpha')}
          className={styles.sortSelect}
        >
          <option value="recent">Most Recent</option>
          <option value="alpha">Alphabetical A-Z</option>
        </select>
      </div>

      <div className={styles.viewToggles} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`viewToggle ${viewMode === 'grid' ? 'viewToggleActive' : ''}`} onClick={() => setViewMode('grid')}>📋 List</button>
        <button className={`viewToggle ${viewMode === 'map' ? 'viewToggleActive' : ''}`} onClick={() => setViewMode('map')}>🗺️ Map</button>
      </div>
      {loading ? (
        <SkeletonList count={3} />
      ) : viewMode === 'map' ? (
        <div>
          <div style={{ height: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 16 }}>
            <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filteredGroups.filter(g => g.latitude && g.longitude).map(g => (
                <Marker key={g.id} position={[g.latitude!, g.longitude!]}>
                  <Popup>
                    <strong>{g.name}</strong>
                    <br />
                    {g.location && <span>📍 {g.location}</span>}
                    <br />
                    <Link href={`/groups/${g.id}`}>View Group →</Link>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {filteredGroups.filter(g => !g.latitude || !g.longitude).length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-secondary)' }}>Global / Not location specific</h3>
              <div className={styles.groupList}>
                {filteredGroups.filter(g => !g.latitude || !g.longitude).map(g => (
                  <Link key={g.id} href={`/groups/${g.id}`} className={styles.groupCard}>
                    <div className={styles.groupInfo}>
                      <strong>{g.name}</strong>
                      {g.description && <p>{g.description.slice(0, 80)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
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
      {!loading && groups.length > 0 && groups.length < totalGroups && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <Button onClick={() => fetchGroups(page + 1, true)}>
            Load More ({totalGroups - groups.length} remaining)
          </Button>
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
                <label>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {GROUP_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <LocationOption
                  value={{ mode: groupLocation.mode, text: groupLocation.text, latitude: groupLocation.latitude, longitude: groupLocation.longitude }}
                  onChange={v => setGroupLocation({ mode: v.mode, text: v.text, latitude: v.latitude, longitude: v.longitude })}
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
              <div className="form-group">
                <label>Hashtags</label>
                <HashtagInput value={groupHashtags} onChange={setGroupHashtags} placeholder="Add hashtags..." />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" onClick={() => setShowModal(false)} variant="ghost">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creating || !name.trim()}>
                  {creating ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
