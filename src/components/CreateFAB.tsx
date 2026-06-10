'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuickCreate } from '@/components/QuickCreateModal'
import styles from './CreateFAB.module.css'

const ACTIONS = [
  { label: 'New Post', icon: '✏️', href: null, action: 'post' },
  { label: 'New Project', icon: '🚀', href: null, action: 'project' },
  { label: 'New Product', icon: '🛒', href: null, action: 'product' },
  { label: 'New Event', icon: '📅', href: null, action: 'event' },
  { label: 'New Group', icon: '👥', href: null, action: 'group' },
  { label: 'New Request', icon: '📝', href: null, action: 'request' },
  { label: 'New Service', icon: '🔧', href: '/dashboard/services' },
]

export default function CreateFAB() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const quickCreate = useQuickCreate()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  if (status !== 'authenticated' || !session) return null
  if (pathname?.startsWith('/auth')) return null

  return (
    <div className={styles.container}>
      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.menu}>
            {ACTIONS.map(action => (
              action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className={styles.menuItem}
                  onClick={() => setOpen(false)}
                >
                  <span className={styles.menuIcon}>{action.icon}</span>
                  <span>{action.label}</span>
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    setOpen(false)
                    quickCreate.open(action.action)
                  }}
                >
                  <span className={styles.menuIcon}>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              )
            ))}
          </div>
        </>
      )}
      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close create menu' : 'Create new'}
        title="Create new"
      >
        <span className={styles.fabIcon}>{open ? '✕' : '+'}</span>
      </button>
    </div>
  )
}
