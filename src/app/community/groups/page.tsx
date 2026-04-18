'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './groups.module.css'

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isPrivate: boolean
  user: { name: string | null }
  _count: { members: number; posts: number }
  isMember: boolean
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'members'>('recent')

  useEffect(() => {
    fetch('/api/groups')
      .then(res => res.json())
      .then(data => {
        setGroups(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredGroups = search
    ? groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    if (sortBy === 'members') return b._count.members - a._count.members
    return 0
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Groups</h1>
          <p>Join communities of like-minded people</p>
        </div>
        <Link href="/groups/new" className="btn-primary">+ Create Group</Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.sortBox}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'recent' | 'members')} className={styles.sortSelect}>
            <option value="recent">Most Recent</option>
            <option value="members">Most Members</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading groups...</div>
      ) : sortedGroups.length === 0 ? (
        <div className={styles.empty}>
          <p>{search ? 'No groups match your search' : 'No groups yet'}</p>
          <Link href="/groups/new" className="btn-primary">Create the first group</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {sortedGroups.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
              <div className={styles.groupImage}>
                {group.imageUrl ? (
                  <Image src={group.imageUrl} alt={group.name} fill style={{objectFit: 'cover'}} />
                ) : (
                  <span className={styles.groupIcon}>👥</span>
                )}
              </div>
              <div className={styles.groupInfo}>
                <h3>{group.name}</h3>
                {group.description && <p>{group.description}</p>}
                <div className={styles.groupMeta}>
                  <span>👤 {group.user.name || 'Unknown'}</span>
                  <span>👥 {group._count.members} members</span>
                  {group._count.posts > 0 && <span>📝 {group._count.posts} posts</span>}
                </div>
                {group.isPrivate && <span className={styles.privateBadge}>Private</span>}
                {group.isMember && <span className={styles.memberBadge}>Member</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}