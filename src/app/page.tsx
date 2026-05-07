'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS } from '@/lib/constants'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
}

interface PlatformStats {
  members: number
  shops: number
  products: number
  events: number
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
  const [donations, setDonations] = useState<DonationAddr[]>([])
  const [qrOpen, setQrOpen] = useState<string | null>(null)
  const [stats, setStats] = useState<PlatformStats>({ members: 0, shops: 0, products: 0, events: 0 })
  const [featuredShops, setFeaturedShops] = useState<FeaturedShop[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [recentRequests, setRecentRequests] = useState<PublicRequest[]>([])
  const [animatedStats, setAnimatedStats] = useState<PlatformStats>({ members: 0, shops: 0, products: 0, events: 0 })

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
          products: Math.min(Math.round((stats.products / steps) * step), stats.products),
          events: Math.min(Math.round((stats.events / steps) * step), stats.events),
        })
        if (step >= steps) clearInterval(timer)
      }, interval)
      return () => clearInterval(timer)
    } else if (stats.members === 0) {
      setAnimatedStats(stats)
    }
  }, [stats])

  useEffect(() => {
    fetch('/api/site/donations')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.addresses) setDonations(data.addresses) })
      .catch(() => {})

    fetch('/api/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(() => {})

    fetch('/api/shops')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.shops) setFeaturedShops(data.shops.slice(0, 6)) })
      .catch(() => {})

    fetch('/api/products?pinned=true')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.products) setFeaturedProducts(data.products.slice(0, 6)) })
      .catch(() => {})

    fetch('/api/requests?isPublic=true&take=4')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const list = data?.requests || (Array.isArray(data) ? data : [])
        if (Array.isArray(list)) setRecentRequests(list.slice(0, 4))
      })
      .catch(() => {})
  }, [])

  const activeQr = donations.find(d => d.id === qrOpen)

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
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{animatedStats.members}</span>
            <span className={styles.statText}>Members</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{animatedStats.shops}</span>
            <span className={styles.statText}>Shops</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{animatedStats.products}</span>
            <span className={styles.statText}>Products</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{animatedStats.events}</span>
            <span className={styles.statText}>Events</span>
          </div>
        </div>
      </section>

      {/* Featured Shops */}
      {featuredShops.length > 0 && (
        <section className={styles.featuredSection}>
          <h2 className={styles.sectionTitle}>Featured Shops</h2>
          <p className={styles.sectionSubtitle}>Discover unique shops from our community</p>
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
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className={styles.featuredSection}>
          <h2 className={styles.sectionTitle}>Featured Products</h2>
          <p className={styles.sectionSubtitle}>Check out these amazing products</p>
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
        </section>
      )}

      {/* Recent Community Requests */}
      {recentRequests.length > 0 && (
        <section className={styles.featuredSection}>
          <h2 className={styles.sectionTitle}>Community Requests</h2>
          <p className={styles.sectionSubtitle}>Help fund community needs</p>
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
        </section>
      )}

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

      {/* Donation Section */}
      {donations.length > 0 && (
        <section className={styles.donationSection}>
          <div className={styles.donationContent}>
            <h2>Support XistrYmemZ</h2>
            <p>Help us keep the platform free and independent. Every contribution counts.</p>
            <div className={styles.donationGrid}>
              {donations.map(da => (
                <div key={da.id} className={styles.donationCard}>
                  <div className={styles.donationHeader}>
                    <img
                      src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`}
                      alt={da.currency}
                      className={styles.donationIcon}
                    />
                    <span className={styles.donationLabel}>{da.label || da.currency}</span>
                  </div>
                  <code className={styles.donationAddr} title={da.address}>{da.address}</code>
                  <div className={styles.donationQr}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(da.address)}&bgcolor=0d0d0d&color=ffffff`}
                      alt={`${da.currency} QR code`}
                      width={150}
                      height={150}
                    />
                  </div>
                  <DonationActions address={da.address} onQrClick={() => setQrOpen(da.id)} size="md" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {activeQr && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrOpen(null)}
          currency={activeQr.currency}
          address={activeQr.address}
        />
      )}
    </div>
  )
}
