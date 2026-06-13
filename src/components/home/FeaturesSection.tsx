'use client'

import Link from 'next/link'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useTranslations } from 'next-intl'
import styles from './FeaturesSection.module.css'

export default function FeaturesSection() {
  const { ref, visible } = useScrollReveal()
  const t = useTranslations('home')
  const GROUPS = [
    {
      title: t('buildAndSell'),
      icon: '🏪',
      features: [
        { icon: '🏪', title: 'Shop', desc: 'Create your storefront, list products or services, and accept payments.', href: '/shops' },
        { icon: '🛒', title: 'Products', desc: 'Sell physical goods, digital items, or offer services with flexible pricing.', href: '/products' },
        { icon: '🔧', title: 'Services', desc: 'Offer your skills — tutoring, design, consultations. Accept appointments with built-in scheduling.', href: '/services' },
        { icon: '🏠', title: 'Rentals', desc: 'List items for rent with daily, weekly, monthly pricing and deposits.', href: '/rentals' },
        { icon: '🤝', title: 'Offers & Barter', desc: 'Exchange items or services directly through barter. Make offers, negotiate, and close arrangements.', href: '/dashboard/offers' },
      ]
    },
    {
      title: t('connectAndShare'),
      icon: '🌐',
      features: [
        { icon: '👥', title: 'Members Directory', desc: 'Discover and connect with members in your community and beyond.', href: '/community' },
        { icon: '🔗', title: 'Connections', desc: 'Build your network, follow activity, and collaborate with trusted peers.', href: '/connections' },
        { icon: '👥', title: 'Groups', desc: 'Find your people. Join or create groups around interests, locations, or projects.', href: '/community/groups' },
        { icon: '💬', title: 'Forum', desc: 'Discuss ideas, ask questions, and share knowledge with the community.', href: '/community/forum' },
        { icon: '📅', title: 'Events', desc: 'Create, discover, and join events. From meetups to workshops to conferences.', href: '/events' },
        { icon: '📹', title: 'Video Chat', desc: 'Start or join video rooms for collaboration, lessons, consultations, or social calls.', href: '/dashboard/video' },
        { icon: '#️⃣', title: 'Hashtags', desc: 'Follow hashtags to discover trending content across projects, services, and posts.', href: '/hashtags' },
        { icon: '🔄', title: 'Share & Repost', desc: 'Share any project, service, or event to your feed or social media.', href: '/dashboard/feed' },
        { icon: '📌', title: 'Boards', desc: 'Pin announcements, listings, and cards to location-based community bulletin boards.', href: '/boards' },
        { icon: '🌐', title: 'Discover', desc: 'Browse an interactive map of everything near you — people, products, events, and projects.', href: '/discover' },
        { icon: '📬', title: 'Inbox', desc: 'Unified inbox for messages, connection requests, offers, and collaboration invites.', href: '/dashboard/messages' },
      ]
    },
    {
      title: t('createAndTeach'),
      icon: '🎓',
      features: [
        { icon: '🚀', title: 'Projects', desc: 'Create plans with goals, milestones, and track progress. Rally collaborators.', href: '/projects' },
        { icon: '📝', title: 'Requests', desc: 'Need help? Post a request. Have skills? Fulfill and earn reputation.', href: '/requests' },
        { icon: '🏫', title: 'School & Teaching', desc: 'Create courses, share knowledge, and earn from your expertise.', href: '/schools' },
        { icon: '🗓️', title: 'Planner & Appointments', desc: 'Schedule appointments, set availability, and manage your calendar.', href: '/dashboard/appointments' },
        { icon: '🤲', title: 'Collaboration', desc: 'Send and receive collaboration requests for products, events, groups, and projects.', href: '/dashboard/messages' },
      ]
    },
    {
      title: t('ourPromise'),
      icon: '🛡️',
      features: [
        { icon: '🚫', title: t('promiseAdFree'), desc: t('promiseAdFreeDesc'), href: '/about' },
        { icon: '🔒', title: t('promiseNoDataSelling'), desc: t('promiseNoDataSellingDesc'), href: '/privacy' },
        { icon: '🤖', title: t('promiseAiFree'), desc: t('promiseAiFreeDesc'), href: '/about' },
        { icon: '📊', title: t('promiseNoAlgorithms'), desc: t('promiseNoAlgorithmsDesc'), href: '/about' },
        { icon: '👁️', title: t('promiseNoShadowbans'), desc: t('promiseNoShadowbansDesc'), href: '/about' },
        { icon: '✊', title: t('promiseNoCensorship'), desc: t('promiseNoCensorshipDesc'), href: '/terms' },
      ]
    }
  ]

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>{t('featuresTitle')}</h2>
      <p className={styles.sectionSubtitle}>{t('featuresSubtitle')}</p>
      {GROUPS.map((group, gi) => (
        <div key={gi} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.icon} {group.title}</h3>
          <div className={styles.grid}>
            {group.features.map((f, i) => (
              <Link key={i} href={f.href} className={styles.card}>
                <span className={styles.icon}>{f.icon}</span>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}