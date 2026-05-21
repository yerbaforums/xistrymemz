'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './CreateFAB.module.css'

const ACTIONS = [
  { label: 'New Post', icon: '✏️', href: null, action: 'post' },
  { label: 'New Project', icon: '🚀', href: '/plans' },
  { label: 'New Product', icon: '🛒', href: '/products/new' },
  { label: 'New Event', icon: '📅', href: '/events/new' },
  { label: 'New Group', icon: '👥', href: '/groups/new' },
  { label: 'New Request', icon: '📝', href: '/requests' },
]

export default function CreateFAB() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (status !== 'authenticated' || !session) return null
  if (pathname?.startsWith('/auth')) return null
  if (!visible) return null

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
                    window.location.href = '/dashboard/feed'
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
