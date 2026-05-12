'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import HomeMap from '@/components/HomeMap'

interface PlatformStats {
  members: number; shops: number; schools: number
  products: number; services: number; rentals: number
  events: number; plans: number; requests: number
  forumPosts: number; forumReplies: number
}

interface FeaturedShop {
  id: string; shopName: string; shopImage: string | null; shopSlug: string
  _count?: { products: number }
}

interface FeaturedProduct {
  id: string; title: string; price: number | null; imageUrl: string | null
  user: { name: string | null; shopSlug: string | null }
}

interface PublicRequest {
  id: string; title: string; status: string
  currentFunding: number | null; goalAmount: number | null
  user: { name: string | null }
}

const ZERO_STATS: PlatformStats = {
  members: 0, shops: 0, schools: 0, products: 0, services: 0,
  rentals: 0, events: 0, plans: 0, requests: 0, forumPosts: 0, forumReplies: 0
}

const FEATURES = [
  { icon: '🌌', title: 'Cosmic Whitepages', desc: 'Your universal directory. One identity across the entire network — searchable, verifiable, yours.', href: '/community' },
  { icon: '🤝', title: 'Cooperative Network', desc: 'Built by the community, for the community. Every member contributes, every voice matters, every connection counts.', href: '/community' },
  { icon: '🚀', title: 'Launch Projects', desc: 'Create plans with goals, milestones, and track progress. Rally helpers and build something extraordinary together.', href: '/plans/public' },
  { icon: '📋', title: 'Request & Fulfill', desc: 'Need help? Post a request. Have skills? Step up and fulfill. Simple coordination for complex collaboration.', href: '/requests' },
  { icon: '🏪', title: 'Shop & School', desc: 'Sell products, teach courses, accept payments. Build your business and share your expertise with the world.', href: '/shops' },
  { icon: '🌍', title: 'Earth Passport', desc: 'Verified identity, reputation scores, and trust badges. Your digital passport for the cooperative economy.', href: '/about' },
  { icon: '💰', title: 'Crypto Native', desc: 'Donations, barter offers, escrow, and direct payments. Privacy-respecting financial tools built in.', href: '/wallet' },
  { icon: '👥', title: 'Community Groups', desc: 'Find your people. Join groups, coordinate efforts, and build networks that span neighborhoods and continents.', href: '/groups' },
  { icon: '🔗', title: 'Open & Connected', desc: 'Link your profiles, shops, and social presence. Everything interconnected, nothing siloed.', href: '/profile/settings' },
]

const STEPS = [
  { num: '01', title: 'Sign Up', desc: 'Create your account and claim your cosmic identity. No barriers, no gatekeeping.' },
  { num: '02', title: 'Build Your Profile', desc: 'Add your bio, links, shop, school. Make yourself findable in the whitepages.' },
  { num: '03', title: 'Connect & Create', desc: 'Join the network. Start projects, make requests, find collaborators.' },
  { num: '04', title: 'Grow Together', desc: 'Build reputation, earn trust, expand your reach. The coop grows with you.' },
]

const STAT_CARDS = [
  { key: 'members' as const, icon: '👥', label: 'Members', href: '/community' },
  { key: 'shops' as const, icon: '🏪', label: 'Shops', href: '/shops' },
  { key: 'schools' as const, icon: '🏫', label: 'Schools', href: '/schools' },
  { key: 'products' as const, icon: '🛒', label: 'Products', href: '/products' },
  { key: 'services' as const, icon: '🔧', label: 'Services', href: '/products?type=SERVICE' },
  { key: 'rentals' as const, icon: '🏠', label: 'Rentals', href: '/products?type=RENTAL' },
  { key: 'forumPosts' as const, icon: '📣', label: 'Forum Posts', href: '/community/forum' },
  { key: 'forumReplies' as const, icon: '💬', label: 'Forum Replies', href: '/community/forum' },
  { key: 'events' as const, icon: '📅', label: 'Events', href: '/events' },
  { key: 'plans' as const, icon: '🚀', label: 'Projects', href: '/plans/public' },
  { key: 'requests' as const, icon: '📝', label: 'Requests', href: '/requests' },
]

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function useCountUp(target: PlatformStats): PlatformStats {
  const [current, setCurrent] = useState<PlatformStats>(ZERO_STATS)
  const prevTarget = useRef<PlatformStats>(ZERO_STATS)
  const rafId = useRef<number>(0)

  useEffect(() => {
    if (target.members === 0) { setCurrent(ZERO_STATS); return }

    const startTime = performance.now()
    const duration = 1400
    const from = prevTarget.current
    const to = target
    const keys = Object.keys(to) as (keyof PlatformStats)[]

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = easeOutCubic(t)
      const next = { ...ZERO_STATS } as PlatformStats
      for (const key of keys) {
        const startVal = from[key]
        const endVal = to[key]
        next[key] = Math.round(startVal + (endVal - startVal) * eased)
      }
      setCurrent(next)
      if (t < 1) rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    prevTarget.current = to
    return () => cancelAnimationFrame(rafId.current)
  }, [target])

  return current
}

function useIntersect(ref: React.RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])

  return visible
}

type SectionRef = HTMLDivElement

export default function Home() {
  const [stats, setStats] = useState<PlatformStats>(ZERO_STATS)
  const [shops, setShops] = useState<FeaturedShop[]>([])
  const [products, setProducts] = useState<FeaturedProduct[]>([])
  const [requests, setRequests] = useState<PublicRequest[]>([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [trendingTags, setTrendingTags] = useState<{ tag: string; postCount: number }[]>([])
  const animatedStats = useCountUp(stats)

  const pulseRef = useRef<SectionRef>(null)
  const stepsRef = useRef<SectionRef>(null)
  const featuresRef = useRef<SectionRef>(null)
  const ctaRef = useRef<SectionRef>(null)
  const pulseVisible = useIntersect(pulseRef)
  const stepsVisible = useIntersect(stepsRef)
  const featuresVisible = useIntersect(featuresRef)
  const ctaVisible = useIntersect(ctaRef)

  const fetchProducts = useCallback(async (type?: string) => {
    setLoadingProducts(true)
    try {
      const params = !type || type === 'all' ? 'pinned=true' : `pinned=true&type=${type}`
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.products) setProducts(data.products.slice(0, 6))
      }
    } catch { } finally { setLoadingProducts(false) }
  }, [])

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})

    fetch('/api/shops')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.shops) setShops(d.shops.slice(0, 4)); setLoadingShops(false) })
      .catch(() => setLoadingShops(false))

    fetchProducts('all')

    fetch('/api/requests?isPublic=true&take=4')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list = d?.requests || (Array.isArray(d) ? d : [])
        if (Array.isArray(list)) setRequests(list.slice(0, 4))
        setLoadingRequests(false)
      })
      .catch(() => setLoadingRequests(false))

    fetch('/api/hashtags?mode=trending&limit=12')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.hashtags) setTrendingTags(d.hashtags.filter((h: { postCount: number }) => h.postCount > 0)) })
      .catch(() => {})
  }, [fetchProducts])

  return (
    <div className={styles.landing}>
      {/* Hero */}
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
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search members, shops, projects..."
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}`
                }
              }}
            />
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
        <div className={styles.heroGradient} />
      </section>

      {/* Platform Stats */}
      <section className={styles.statsSection}>
        <h2 className={styles.statsHeading}>Platform Stats</h2>
        <div className={styles.statsGrid}>
          {STAT_CARDS.map(card => (
            <Link key={card.key} href={card.href} className={styles.statCard}>
              <span className={styles.statIcon}>{card.icon}</span>
              <span className={styles.statValue}>{animatedStats[card.key]}</span>
              <span className={styles.statLabel}>{card.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {trendingTags.length > 0 && (
        <section className={styles.hashtagSection}>
          <h2 className={styles.statsHeading}>Trending Hashtags</h2>
          <div className={styles.hashtagCloud}>
            {trendingTags.map(h => (
              <Link key={h.tag} href={`/hashtag/${h.tag}`} className={styles.hashtagPill}>
                <span>#{h.tag}</span>
                <span className={styles.hashtagCount}>{h.postCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Community Pulse */}
      <section ref={pulseRef} className={`${styles.pulseSection} ${pulseVisible ? styles.visible : ''}`}>
        <h2 className={styles.sectionTitle}>Community Pulse</h2>
        <p className={styles.sectionSubtitle}>What&apos;s happening right now in the cooperative</p>
        <div className={styles.pulseGrid}>
          <div className={styles.pulseCard}>
            <div className={styles.pulseHeader}>
              <span className={styles.pulseIcon}>🏪</span>
              <h3>Latest Shops</h3>
            </div>
            {loadingShops ? (
              <div className={styles.pulseList}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
            ) : shops.length > 0 ? (
              <div className={styles.pulseList}>
                {shops.map(shop => (
                  <Link key={shop.id} href={`/shop/${shop.shopSlug}`} className={styles.pulseItem}>
                    <span className={styles.pulseItemIcon}>
                      {shop.shopImage ? <img src={shop.shopImage} alt="" /> : '🏪'}
                    </span>
                    <span className={styles.pulseItemTitle}>{shop.shopName}</span>
                    {shop._count && <span className={styles.pulseItemMeta}>{shop._count.products}</span>}
                  </Link>
                ))}
              </div>
            ) : <p className={styles.pulseEmpty}>No shops yet</p>}
            <Link href="/shops" className={styles.pulseViewAll}>View all shops →</Link>
          </div>
          <div className={styles.pulseCard}>
            <div className={styles.pulseHeader}>
              <span className={styles.pulseIcon}>🛒</span>
              <h3>Featured Products</h3>
            </div>
            {loadingProducts ? (
              <div className={styles.pulseList}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
            ) : products.length > 0 ? (
              <div className={styles.pulseList}>
                {products.slice(0, 4).map(product => (
                  <Link key={product.id} href={`/products/${product.id}`} className={styles.pulseItem}>
                    <span className={styles.pulseItemIcon}>
                      {product.imageUrl ? <img src={product.imageUrl} alt="" /> : '🛒'}
                    </span>
                    <div className={styles.pulseItemCol}>
                      <span className={styles.pulseItemTitle}>{product.title}</span>
                      <span className={styles.pulseItemMeta}>by {product.user.name || 'Unknown'}</span>
                    </div>
                    {product.price && <span className={styles.pulseItemPrice}>${product.price}</span>}
                  </Link>
                ))}
              </div>
            ) : <p className={styles.pulseEmpty}>No products yet</p>}
            <Link href="/products" className={styles.pulseViewAll}>View all products →</Link>
          </div>
          <div className={styles.pulseCard}>
            <div className={styles.pulseHeader}>
              <span className={styles.pulseIcon}>📝</span>
              <h3>Community Requests</h3>
            </div>
            {loadingRequests ? (
              <div className={styles.pulseList}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
            ) : requests.length > 0 ? (
              <div className={styles.pulseList}>
                {requests.map(req => (
                  <Link key={req.id} href={`/requests/${req.id}`} className={styles.pulseItem}>
                    <span className={styles.pulseItemIcon}>📝</span>
                    <div className={styles.pulseItemCol}>
                      <span className={styles.pulseItemTitle}>{req.title}</span>
                      <span className={styles.pulseItemMeta}>by {req.user?.name || 'Unknown'}</span>
                    </div>
                    {req.goalAmount && (
                      <span className={styles.pulseItemPrice}>
                        ${req.currentFunding || 0}/${req.goalAmount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : <p className={styles.pulseEmpty}>No requests yet</p>}
            <Link href="/requests" className={styles.pulseViewAll}>View all requests →</Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={stepsRef} className={`${styles.stepsSection} ${stepsVisible ? styles.visible : ''}`}>
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
      <section ref={featuresRef} className={`${styles.features} ${featuresVisible ? styles.visible : ''}`}>
        <h2 className={styles.sectionTitle}>What You Can Build</h2>
        <p className={styles.sectionSubtitle}>Everything you need to connect, create, and collaborate</p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <Link key={i} href={f.href} className={styles.feature}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Global Activity Map */}
      <HomeMap />

      {/* CTA */}
      <section ref={ctaRef} className={`${styles.ctaSection} ${ctaVisible ? styles.visible : ''}`}>
        <div className={styles.ctaContent}>
          <h2>Ready to Claim Your Place?</h2>
          <p>
            Join <strong className={styles.ctaCount}>{animatedStats.members.toLocaleString()}</strong> other members
            on the cosmic whitepages cooperative. Create your profile, launch your first project,
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

      {/* Footer */}
      <section className={styles.footerLinks}>
        <div className={styles.ctaLinks}>
          <Link href="/about">About</Link>
          <Link href="/help">Help</Link>
          <Link href="/community">Community</Link>
          <Link href="/community/forum">Forum</Link>
          <Link href="/requests">Requests</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <p className={styles.copyright}>&copy; {new Date().getFullYear()} XistrYmemZ — Cosmic Whitepages Cooperative</p>
      </section>
    </div>
  )
}
