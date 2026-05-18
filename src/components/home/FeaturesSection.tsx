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
      { icon: '🏠', title: 'Rentals', desc: 'List items for rent with daily, weekly, monthly pricing and deposits.', href: '/products?type=RENTAL' },
      { icon: '🤝', title: 'Offers & Barter', desc: 'Trade items or services directly. Make offers, negotiate, and close deals.', href: '/offers' },
      { icon: '🚚', title: 'Courier', desc: 'Set up delivery services and manage local pickup or shipping.', href: '/courier/setup' },
    ]
  },
  {
    title: 'Connect & Share',
    icon: '🌐',
    features: [
      { icon: '👥', title: 'Members Directory', desc: 'Discover and connect with members in your community and beyond.', href: '/community' },
      { icon: '🔗', title: 'Connections', desc: 'Build your network, follow activity, and collaborate with trusted peers.', href: '/connections' },
      { icon: '👥', title: 'Groups', desc: 'Find your people. Join or create groups around interests, locations, or projects.', href: '/groups' },
      { icon: '💬', title: 'Forum', desc: 'Discuss ideas, ask questions, and share knowledge with the community.', href: '/community/forum' },
      { icon: '📅', title: 'Events', desc: 'Create, discover, and join events. From meetups to workshops to conferences.', href: '/events' },
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
    title: 'Grow & Earn',
    icon: '💰',
    features: [
      { icon: '🌍', title: 'Earth Passport', desc: 'Verified identity, reputation scores, and trust badges across the network.', href: '/about' },
      { icon: '💰', title: 'Crypto Wallet', desc: 'Privacy-respecting crypto payments, tips, donations, and escrow built in.', href: '/wallet' },
      { icon: '📋', title: 'Templates', desc: 'Start fast with pre-built templates for shops, schools, and services.', href: '/templates' },
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
