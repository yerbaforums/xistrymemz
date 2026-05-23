'use client'

import Link from 'next/link'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import styles from './FeaturesSection.module.css'

const GROUPS = [
  {
    title: 'Build & Sell',
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
    title: 'Connect & Share',
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
    ]
  },
  {
    title: 'Create & Teach',
    icon: '🎓',
    features: [
      { icon: '🚀', title: 'Projects', desc: 'Create plans with goals, milestones, and track progress. Rally collaborators.', href: '/plans/public' },
      { icon: '📝', title: 'Requests', desc: 'Need help? Post a request. Have skills? Fulfill and earn reputation.', href: '/requests' },
      { icon: '🏫', title: 'School & Teaching', desc: 'Create courses, share knowledge, and earn from your expertise.', href: '/schools' },
      { icon: '🗓️', title: 'Planner & Appointments', desc: 'Schedule appointments, set availability, and manage your calendar.', href: '/dashboard/appointments' },
    ]
  },
  {
    title: 'Our Promise',
    icon: '🛡️',
    features: [
      { icon: '🚫', title: 'Ad-Free', desc: 'No ads, no sponsored posts, no promoted content. Your experience is never interrupted by advertising.', href: '/about' },
      { icon: '🔒', title: 'No Data Selling', desc: 'Your personal data is never sold, shared, or traded to third parties. No exceptions, no loopholes.', href: '/privacy' },
      { icon: '🤖', title: 'AI-Free', desc: 'No AI scraping, no AI-generated content in your feed, no training on your data. Real people only.', href: '/about' },
      { icon: '📊', title: 'No Algorithms', desc: 'Content appears chronologically by your choices, not by engagement-maximizing algorithms.', href: '/about' },
      { icon: '👁️', title: 'No Shadowbanning', desc: 'No secret suppression of your reach. If there\'s an issue, you\'re told directly. Full transparency.', href: '/about' },
      { icon: '✊', title: 'No Censorship', desc: 'Legal content is never removed for viewpoint. The community sets its own norms through groups and forums.', href: '/terms' },
    ]
  }
]

export default function FeaturesSection() {
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>What You Can Build</h2>
      <p className={styles.sectionSubtitle}>Everything you need to connect, create, and collaborate</p>
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