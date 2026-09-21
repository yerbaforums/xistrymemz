'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import FollowButton from '@/components/FollowButton'
import CollaborateButton from '@/components/CollaborateButton'
import { getUserProfileUrl } from '@/lib/utils'
import styles from './WorkTogether.module.css'

/**
 * Uniform "work together" row: every listing/show header converts interest
 * into connection — profile, follow, message, collaborate.
 */
export default function WorkTogether({
  user,
  entityType,
  entityId,
  entityTitle,
  collaborateLabel = '🤝 Collaborate',
}: {
  user: { id: string; name: string | null; username?: string | null; image?: string | null }
  entityType:
    | 'PRODUCT' | 'SERVICE' | 'PROJECT' | 'REQUEST' | 'EVENT'
    | 'BLOG' | 'PODCAST' | 'SCHOOLCONTENT'
  entityId: string
  entityTitle: string
  collaborateLabel?: string
}) {
  const { data: session } = useSession()
  if (session?.user?.id === user.id) return null
  const canCollaborate =
    entityType === 'PRODUCT' || entityType === 'SERVICE' || entityType === 'PROJECT' || entityType === 'REQUEST' || entityType === 'EVENT'

  return (
    <div className={styles.row} aria-label={`Work with ${user.name || 'this member'}`}>
      <Link href={getUserProfileUrl(user)} className={styles.profile}>
        {user.image ? (
          <img src={user.image} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatarFallback}>{(user.name || 'U')[0]}</span>
        )}
        <span className={styles.name}>{user.name || 'Unknown'}</span>
      </Link>
      <span className={styles.actions}>
        <FollowButton userId={user.id} />
        <Link href={`/dashboard/messages?user=${user.id}`} className={styles.msgBtn}>
          💬 Message
        </Link>
        {canCollaborate && (
          <CollaborateButton entityType={entityType as 'PRODUCT' | 'SERVICE' | 'PROJECT' | 'REQUEST' | 'EVENT'} entityId={entityId} label={collaborateLabel} variant="secondary" />
        )}
      </span>
      <span className={styles.hint}>Mention “{entityTitle.slice(0, 40)}” so they know what it’s about</span>
    </div>
  )
}
