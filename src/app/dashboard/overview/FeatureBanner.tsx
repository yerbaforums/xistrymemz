'use client'

import { useState, useEffect } from 'react'
import overviewStyles from './OverviewCards.module.css'

interface Banner {
  id: string
  icon: string
  title: string
  desc: string
  link?: { href: string; label: string }
}

const BANNERS: Banner[] = [
  {
    id: 'planner',
    icon: '🗓️',
    title: 'New: Planner Dashboard',
    desc: 'Manage appointments, personal events, and group activities in one place.',
    link: { href: '/dashboard/appointments', label: 'Open Planner' }
  },
  {
    id: 'appointments',
    icon: '📅',
    title: 'New: Book Appointments',
    desc: 'Set your availability and let others book time with you directly.',
    link: { href: '/profile/edit', label: 'Set Availability' }
  },
  {
    id: 'repost',
    icon: '🔄',
    title: 'New: Repost & Share',
    desc: 'Share posts to your profile, repost content, and reach more people.',
    link: { href: '/dashboard/feed', label: 'Go to Feed' }
  },
]

export default function FeatureBanner() {
  const [visibleId, setVisibleId] = useState<string | null>(null)

  useEffect(() => {
    for (const b of BANNERS) {
      const dismissed = localStorage.getItem(`banner_dismissed_${b.id}`)
      if (!dismissed) {
        setVisibleId(b.id)
        return
      }
    }
  }, [])

  const banner = BANNERS.find(b => b.id === visibleId)
  if (!banner) return null

  const dismiss = () => {
    localStorage.setItem(`banner_dismissed_${banner.id}`, 'true')
    setVisibleId(null)
  }

  return (
    <div className={overviewStyles.featureBanner}>
      <div className={overviewStyles.bannerContent}>
        <span className={overviewStyles.bannerIcon}>{banner.icon}</span>
        <div>
          <strong>{banner.title}</strong>
          <p>{banner.desc}</p>
        </div>
      </div>
      <div className={overviewStyles.bannerActions}>
        {banner.link && (
          <a href={banner.link.href} className={overviewStyles.bannerBtn}>{banner.link.label}</a>
        )}
        <button onClick={dismiss} className={overviewStyles.bannerDismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  )
}
