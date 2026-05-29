'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './CreateFAB.module.css'

const ACTIONS = [
  { label: 'New Post', icon: '✏️', href: null, action: 'post' },
  { label: 'New Project', icon: '🚀', href: '/dashboard/projects' },
  { label: 'New Product', icon: '🛒', href: '/products/new' },
  { label: 'New Event', icon: '📅', href: '/events/new' },
  { label: 'New Group', icon: '👥', href: '/groups/new' },
  { label: 'New Request', icon: '📝', href: '/requests' },
  { label: 'New Service', icon: '🔧', href: '/dashboard/services' },
]

export default function CreateFAB() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
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
                    router.push('/dashboard/feed')
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
