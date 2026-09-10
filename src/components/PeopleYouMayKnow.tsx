'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import { CLASS_ICONS } from '@/lib/user-classes'
import type { ConstellationStar } from '@/lib/constellation'
import styles from './PeopleYouMayKnow.module.css'

interface PeopleYouMayKnowProps {
  limit?: number
  className?: string
}

function getReason(star: ConstellationStar, connectedIds: Set<string>): string {
  if (connectedIds.has(star.id)) return 'Already connected'
  if (star.connectionStrength >= 1) return 'Connected to you'
  if (star.groupIds.length > 0) return `Shares ${star.groupIds.length} group${star.groupIds.length === 1 ? '' : 's'} with you`
  if (star.active) return 'Active now in your area'
  if (star.lookingForCollaborators) return 'Looking for collaborators'
  return 'Nearby member'
}

export default function PeopleYouMayKnow({ limit = 5, className }: PeopleYouMayKnowProps) {
  const { data: session, status } = useSession()
  const { success, error } = useToast()
  const [members, setMembers] = useState<ConstellationStar[]>([])
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/constellation?limit=120')
        if (!res.ok || cancelled) return
        const data = await res.json()
        const constData = data?.data || data
        const connected = new Set<string>(constData.currentUser?.connectedIds || [])
        setConnectedIds(connected)

        const ranked = (constData.stars || [])
          .filter((s: ConstellationStar) => !connected.has(s.id))
          .sort((a: ConstellationStar, b: ConstellationStar) => {
            const scoreA = (a.active ? 3 : 0) + a.connectionStrength * 2 + a.reputationScore / 100 + a.groupIds.length * 0.5
            const scoreB = (b.active ? 3 : 0) + b.connectionStrength * 2 + b.reputationScore / 100 + b.groupIds.length * 0.5
            return scoreB - scoreA
          })
          .slice(0, limit)
        setMembers(ranked)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [status, limit])

  const handleConnect = async (memberId: string) => {
    if (!session?.user?.id) return
    setConnecting(memberId)
    try {
      const res = await fetch('/api/community/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: memberId }),
      })
      if (res.ok) {
        success('Connection request sent!')
        setMembers(prev => prev.filter(m => m.id !== memberId))
      } else {
        error('Failed to send request')
      }
    } catch {
      error('Failed to send request')
    } finally {
      setConnecting(null)
    }
  }

  if (status !== 'authenticated') return null

  if (loading) {
    return (
      <div className={`${styles.widget} ${className || ''}`}>
        <h3 className={styles.title}>✨ People You May Know</h3>
        <div className={styles.skeletonList}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonLines}>
                <div className={styles.skeletonLine} style={{ width: '60%' }} />
                <div className={styles.skeletonLine} style={{ width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (members.length === 0) return null

  return (
    <div className={`${styles.widget} ${className || ''}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>✨ People You May Know</h3>
        <Link href="/community?tab=constellation" className={styles.viewAll}>
          View all →
        </Link>
      </div>
      <div className={styles.list}>
        {members.map(member => (
          <div key={member.id} className={styles.card}>
            <Link href={`/profile/${member.username || member.id}`} className={styles.cardLink}>
              {member.image ? (
                <img src={member.image} alt="" className={styles.avatar} />
              ) : (
                <span className={styles.avatarPlaceholder}>{member.title[0]?.toUpperCase() || '?'}</span>
              )}
              <div className={styles.info}>
                <span className={styles.name}>{member.title}</span>
                <span className={styles.reason}>{getReason(member, connectedIds)}</span>
                <span className={styles.meta}>
                  {member.location && <span>📍 {member.location}</span>}
                  {member.userClass && (
                    <span className={styles.classTag}>
                      {CLASS_ICONS[member.userClass.split(',')[0]] || '✦'} {member.userClass.split(',')[0]}
                    </span>
                  )}
                </span>
              </div>
            </Link>
            <button
              className={styles.connectBtn}
              onClick={() => handleConnect(member.id)}
              disabled={connecting === member.id}
            >
              {connecting === member.id ? '…' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}