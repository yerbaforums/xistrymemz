'use client'

import Link from 'next/link'
import styles from './sitemap.module.css'

const siteSections = [
  {
    title: 'Getting Started',
    links: [
      { href: '/', label: 'Home' },
      { href: '/auth/login', label: 'Login' },
      { href: '/auth/register', label: 'Register' },
      { href: '/onboarding', label: 'Onboarding' },
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
      { href: '/help', label: 'Help' },
    ]
  },
  {
    title: 'Dashboard',
    links: [
      { href: '/dashboard/overview', label: 'Overview' },
      { href: '/dashboard/projects', label: 'My Projects' },
      { href: '/dashboard/requests', label: 'My Requests' },
      { href: '/dashboard/marketplace', label: 'Marketplace' },
      { href: '/dashboard/events', label: 'My Events' },
      { href: '/messages', label: 'Messages' },
    ]
  },
  {
    title: 'Projects',
    links: [
      { href: '/plans', label: 'All Projects' },
      { href: '/plans/public', label: 'Browse Public Projects' },
      { href: '/plans/new', label: 'Create New Project' },
    ]
  },
  {
    title: 'Community',
    links: [
      { href: '/community', label: 'Members' },
      { href: '/community/forum', label: 'Forum' },
      { href: '/community/groups', label: 'Groups' },
      { href: '/requests', label: 'Requests' },
      { href: '/requests/public', label: 'Public Requests' },
      { href: '/events', label: 'Events' },
    ]
  },
  {
    title: 'Marketplace',
    links: [
      { href: '/products', label: 'Browse Products' },
      { href: '/shops', label: 'Browse Shops' },
      { href: '/orders', label: 'My Orders' },
      { href: '/shop/setup', label: 'Setup Shop' },
    ]
  },
  {
    title: 'Wallet & Crypto',
    links: [
      { href: '/wallet', label: 'My Wallet' },
    ]
  },
  {
    title: 'Learning',
    links: [
      { href: '/schools', label: 'Browse Schools' },
      { href: '/school/setup', label: 'Create School' },
    ]
  },
  {
    title: 'Account',
    links: [
      { href: '/profile', label: 'My Profile' },
      { href: '/profile/settings', label: 'Settings' },
      { href: '/courier/setup', label: 'Courier Setup' },
    ]
  },
  {
    title: 'Admin',
    links: [
      { href: '/admin/subscribers', label: 'Subscribers' },
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/wallets', label: 'Wallets' },
      { href: '/admin/invite-codes', label: 'Invite Codes' },
    ]
  },
]

export default function SitemapPage() {
  return (
    <div className={styles.page}>
      <h1>Site Map</h1>
      <p>Explore all available pages on XistrYmemZ</p>
      
      <div className={styles.grid}>
        {siteSections.map(section => (
          <div key={section.title} className={styles.section}>
            <h2>{section.title}</h2>
            <ul>
              {section.links.map(link => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
