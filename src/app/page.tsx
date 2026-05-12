'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import HomeMap from '@/components/HomeMap'

interface PlatformStats {
  members: number
  shops: number
  schools: number
  products: number
  services: number
  rentals: number
  events: number
  plans: number
  requests: number
}

interface FeaturedShop {
  id: string
  shopName: string
  shopImage: string | null
  shopSlug: string
  _count?: {
    products: number
  }
}

interface FeaturedProduct {
  id: string
  title: string
  price: number | null
  imageUrl: string | null
  user: {
    name: string | null
    shopSlug: string | null
  }
}

interface PublicRequest {
  id: string
  title: string
  status: string
  currentFunding: number | null
  goalAmount: number | null
  user: { name: string | null }
}

const FEATURES = [
  { icon: '🌌', title: 'Cosmic Whitepages', desc: 'Your universal directory. One identity across the entire network — searchable, verifiable, yours.' },
  { icon: '🤝', title: 'Cooperative Network', desc: 'Built by the community, for the community. Every member contributes, every voice matters, every connection counts.' },
  { icon: '🚀', title: 'Launch Projects', desc: 'Create plans with goals, milestones, and track progress. Rally helpers and build something extraordinary together.' },
  { icon: '📋', title: 'Request & Fulfill', desc: 'Need help? Post a request. Have skills? Step up and fulfill. Simple coordination for complex collaboration.' },
  { icon: '🏪', title: 'Shop & School', desc: 'Sell products, teach courses, accept payments. Build your business and share your expertise with the world.' },
  { icon: '🌍', title: 'Earth Passport', desc: 'Verified identity, reputation scores, and trust badges. Your digital passport for the cooperative economy.' },
  { icon: '💰', title: 'Crypto Native', desc: 'Donations, barter offers, escrow, and direct payments. Privacy-respecting financial tools built in.' },
  { icon: '👥', title: 'Community Groups', desc: 'Find your people. Join groups, coordinate efforts, and build networks that span neighborhoods and continents.' },
  { icon: '🔗', title: 'Open & Connected', desc: 'Link your profiles, shops, and social presence. Everything interconnected, nothing siloed.' },
]

const STEPS = [
  { num: '01', title: 'Sign Up', desc: 'Create your account and claim your cosmic identity. No barriers, no gatekeeping.' },
  { num: '02', title: 'Build Your Profile', desc: 'Add your bio, links, shop, school. Make yourself findable in the whitepages.' },
  { num: '03', title: 'Connect & Create', desc: 'Join the network. Start projects, make requests, find collaborators.' },
  { num: '04', title: 'Grow Together', desc: 'Build reputation, earn trust, expand your reach. The coop grows with you.' },
]

export default function Home() {
  const [stats, setStats] = useState<PlatformStats>({ members: 0, shops: 0, schools: 0, products: 0, services: 0, rentals: 0, events: 0, plans: 0, requests: 0 })
  const [featuredShops, setFeaturedShops] = useState<FeaturedShop[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [recentRequests, setRecentRequests] = useState<PublicRequest[]>([])
  const [animatedStats, setAnimatedStats] = useState<PlatformStats>({ members: 0, shops: 0, schools: 0, products: 0, services: 0, rentals: 0, events: 0, plans: 0, requests: 0 })
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [featuredType, setFeaturedType] = useState<string>('all')

  useEffect(() => {
    if (stats.members > 0 && animatedStats.members !== stats.members) {
      const duration = 1200
      const steps = 30
      const interval = duration / steps
      let step = 0
      const timer = setInterval(() => {
        step++
        setAnimatedStats({
          members: Math.min(Math.round((stats.members / steps) * step), stats.members),
          shops: Math.min(Math.round((stats.shops / steps) * step), stats.shops),
          schools: Math.min(Math.round((stats.schools / steps) * step), stats.schools),
          products: Math.min(Math.round((stats.products / steps) * step), stats.products),
          services: Math.min(Math.round((stats.services / steps) * step), stats.services),
          rentals: Math.min(Math.round((stats.rentals / steps) * step), stats.rentals),
          events: Math.min(Math.round((stats.events / steps) * step), stats.events),
          plans: Math.min(Math.round((stats.plans / steps) * step), stats.plans),
          requests: Math.min(Math.round((stats.requests / steps) * step), stats.requests),
        })
        if (step >= steps) clearInterval(timer)
      }, interval)
      return () => clearInterval(timer)
    } else if (stats.members === 0) {
      setAnimatedStats(stats)
    }
  }, [stats])

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(() => {})

    fetch('/api/shops')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.shops) setFeaturedShops(data.shops.slice(0, 6)); setLoadingShops(false) })
      .catch(() => setLoadingShops(false))

    fetchProducts('all')

    fetch('/api/requests?isPublic=true&take=4')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const list = data?.requests || (Array.isArray(data) ? data : [])
        if (Array.isArray(list)) setRecentRequests(list.slice(0, 4)); setLoadingRequests(false)
      })
      .catch(() => setLoadingRequests(false))
  }, [])

  useEffect(() => {
    if (featuredType) fetchProducts(featuredType)
  }, [featuredType])

  async function fetchProducts(type: string) {
    setLoadingProducts(true)
    try {
      const params = type === 'all' ? 'pinned=true' : `pinned=true&type=${type}`
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.products) setFeaturedProducts(data.products.slice(0, 6))
      }
    } catch { } finally {
      setLoadingProducts(false)
    }
  }

  return (
    <div className={styles.landing}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.stars} />
        <div className={styles.heroContent}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="XistrYmemZ" />
            <span>XistrYmemZ</span>
          </div>
          
          <h1 className={styles.title}>
            The <span className={styles.accent}>Cosmic Whitepages</span> Cooperative
          </h1>
          
          <p className={styles.subtitle}>
            Your universal identity, projects, and connections — all in one open network.
            Sign up and start building something extraordinary with the community.
          </p>
          
          <div className={styles.actions}>
            <Link href="/auth/register" className={styles.btnPrimary}>
              Join the Coop →
            </Link>
            <Link href="/shops" className={styles.btnSecondary}>
              Browse Shops
            </Link>
            <Link href="/about" className={styles.btnSecondary}>
              Learn More
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>Open</span>
              <span className={styles.statLabel}>Source</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Free</span>
              <span className={styles.statLabel}>Forever</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Coop</span>
              <span className={styles.statLabel}>Owned</span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className={styles.statsSection}>
        <h2 className={styles.statsHeading}>Platform Stats</h2>
        <div className={styles.statsGrid}>
          <Link href="/community" className={styles.statCard}>
            <span className={styles.statIcon}>👥</span>
            <span className={styles.statValue}>{animatedStats.members}</span>
            <span className={styles.statLabel}>Members</span>
          </Link>
          <Link href="/shops" className={styles.statCard}>
            <span className={styles.statIcon}>🏪</span>
            <span className={styles.statValue}>{animatedStats.shops}</span>
            <span className={styles.statLabel}>Shops</span>
          </Link>
          <Link href="/schools" className={styles.statCard}>
            <span className={styles.statIcon}>🏫</span>
            <span className={styles.statValue}>{animatedStats.schools}</span>
            <span className={styles.statLabel}>Schools</span>
          </Link>
          <Link href="/products" className={styles.statCard}>
            <span className={styles.statIcon}>🛒</span>
            <span className={styles.statValue}>{animatedStats.products}</span>
            <span className={styles.statLabel}>Products</span>
          </Link>
          <Link href="/products?type=SERVICE" className={styles.statCard}>
            <span className={styles.statIcon}>🔧</span>
            <span className={styles.statValue}>{animatedStats.services}</span>
            <span className={styles.statLabel}>Services</span>
          </Link>
          <Link href="/products?type=RENTAL" className={styles.statCard}>
            <span className={styles.statIcon}>🏠</span>
            <span className={styles.statValue}>{animatedStats.rentals}</span>
            <span className={styles.statLabel}>Rentals</span>
          </Link>
          <Link href="/events" className={styles.statCard}>
            <span className={styles.statIcon}>📅</span>
            <span className={styles.statValue}>{animatedStats.events}</span>
            <span className={styles.statLabel}>Events</span>
          </Link>
          <Link href="/plans/public" className={styles.statCard}>
            <span className={styles.statIcon}>🚀</span>
            <span className={styles.statValue}>{animatedStats.plans}</span>
            <span className={styles.statLabel}>Projects</span>
          </Link>
          <Link href="/requests" className={styles.statCard}>
            <span className={styles.statIcon}>📝</span>
            <span className={styles.statValue}>{animatedStats.requests}</span>
            <span className={styles.statLabel}>Requests</span>
          </Link>
        </div>
      </section>

      {/* Featured Shops */}
      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Shops</h2>
        <p className={styles.sectionSubtitle}>Discover unique shops from our community</p>
        {loadingShops ? (
          <div className={styles.horizontalScroll}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.featuredCard}>
                <Skeleton width="100%" height={120} borderRadius="8px" />
                <Skeleton width="70%" height="1rem" className="mt-2" />
                <Skeleton width="40%" height="0.75rem" className="mt-2" />
              </div>
            ))}
          </div>
        ) : featuredShops.length > 0 ? (
          <div className={styles.horizontalScroll}>
            {featuredShops.map(shop => (
              <Link key={shop.id} href={`/shop/${shop.shopSlug}`} className={styles.featuredCard}>
                {shop.shopImage && (
                  <img src={shop.shopImage} alt={shop.shopName} className={styles.featuredImage} />
                )}
                <h3 className={styles.featuredTitle}>{shop.shopName}</h3>
                {shop._count && (
                  <span className={styles.featuredMeta}>{shop._count.products} products</span>
                )}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* Featured Products */}
      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Marketplace</h2>
        <p className={styles.sectionSubtitle}>Discover products, services, and rentals from the community</p>
        <div className={styles.typeTabs}>
          {[
            { key: 'all', label: 'All', icon: '📦' },
            { key: 'PRODUCT', label: 'Products', icon: '🛒' },
            { key: 'SERVICE', label: 'Services', icon: '🔧' },
            { key: 'RENTAL', label: 'Rentals', icon: '🏠' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`${styles.typeTab} ${featuredType === tab.key ? styles.typeTabActive : ''}`}
              onClick={() => setFeaturedType(tab.key)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
        {loadingProducts ? (
          <div className={styles.horizontalScroll}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.featuredCard}>
                <Skeleton width="100%" height={120} borderRadius="8px" />
                <Skeleton width="70%" height="1rem" className="mt-2" />
                <Skeleton width="40%" height="0.75rem" className="mt-2" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className={styles.horizontalScroll}>
            {featuredProducts.map(product => (
              <Link key={product.id} href={`/products/${product.id}`} className={styles.featuredCard}>
                {product.imageUrl && (
                  <img src={product.imageUrl} alt={product.title} className={styles.featuredImage} />
                )}
                <h3 className={styles.featuredTitle}>{product.title}</h3>
                {product.price && <span className={styles.featuredPrice}>${product.price}</span>}
                {product.user.shopSlug && (
                  <span className={styles.featuredMeta}>by {product.user.name || 'Unknown'}</span>
                )}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* Recent Community Requests */}
      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Community Requests</h2>
        <p className={styles.sectionSubtitle}>Help fund community needs</p>
        {loadingRequests ? (
          <div className={styles.horizontalScroll}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.featuredCard}>
                <Skeleton width="80%" height="1rem" />
                <Skeleton width="50%" height="0.75rem" className="mt-2" />
                <Skeleton width="60%" height="0.75rem" className="mt-2" />
              </div>
            ))}
          </div>
        ) : recentRequests.length > 0 ? (
          <div className={styles.horizontalScroll}>
            {recentRequests.map(req => (
              <Link key={req.id} href={`/requests/${req.id}`} className={styles.featuredCard}>
                <h3 className={styles.featuredTitle}>{req.title}</h3>
                <div className={styles.featuredMeta}>
                  by {req.user?.name || 'Unknown'}
                </div>
                {req.goalAmount && (
                  <span className={styles.featuredPrice}>
                    ${req.currentFunding || 0} / ${req.goalAmount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* How It Works */}
      <section className={styles.stepsSection}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>Four steps to join the cooperative</p>
        <div className={styles.stepsGrid}>
          {STEPS.map(step => (
            <div key={step.num} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>What You Can Build</h2>
        <p className={styles.sectionSubtitle}>Everything you need to connect, create, and collaborate</p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => {
            const isShop = f.icon === '🏪'
            if (isShop) {
              return (
                <Link
                  key={i}
                  href="/shops"
                  style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  className={styles.feature}
                >
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </Link>
              )
            }
            return (
              <div key={i} className={styles.feature}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2>Ready to Claim Your Place?</h2>
          <p>
            Join the cosmic whitepages cooperative. Create your profile, launch your first project,
            and start connecting with people who share your vision.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/auth/register" className={styles.btnPrimaryLarge}>
              Sign Up &amp; Start Building
            </Link>
            <Link href="/plans/public" className={styles.btnSecondaryLarge}>
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      <HomeMap />

      {/* Footer Links */}
      <section className={styles.footerLinks}>
        <div className={styles.ctaLinks}>
          <Link href="/about">About</Link>
          <Link href="/help">Help</Link>
          <Link href="/community">Community</Link>
          <Link href="/requests">Requests</Link>
        </div>
        <p className={styles.copyright}>&copy; {new Date().getFullYear()} XistrYmemZ — Cosmic Whitepages Cooperative</p>
      </section>
    </div>
  )
}
