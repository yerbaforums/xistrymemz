'use client'

import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { FeaturedShop, FeaturedProduct, PublicRequest, FeaturedEvent, PublicPlan } from './types'
import styles from './PulseSection.module.css'

interface Props {
  shops: FeaturedShop[]
  products: FeaturedProduct[]
  requests: PublicRequest[]
  events: FeaturedEvent[]
  plans: PublicPlan[]
  loadingShops: boolean
  loadingProducts: boolean
  loadingRequests: boolean
  loadingEvents: boolean
  loadingPlans: boolean
  trendingTags?: { tag: string; entities?: { products: number; events: number; posts: number; forumPosts: number; groupPosts: number } }[]
}

export default function PulseSection({ shops, products, requests, events, plans, loadingShops, loadingProducts, loadingRequests, loadingEvents, loadingPlans, trendingTags }: Props) {
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>Community Pulse</h2>
      <p className={styles.sectionSubtitle}>What&apos;s happening right now in the cooperative</p>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🏪</span>
            <h3>Latest Shops</h3>
          </div>
          {loadingShops ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : shops.length > 0 ? (
            <div className={styles.list}>
              {shops.map(shop => (
                <Link key={shop.id} href={`/shop/${shop.shopSlug}`} className={styles.item}>
                  <span className={styles.itemIcon}>
                    {shop.shopImage ? <img src={shop.shopImage} alt="" /> : '🏪'}
                  </span>
                  <span className={styles.itemTitle}>{shop.shopName}</span>
                  {shop._count && <span className={styles.itemMeta}>{shop._count.products}</span>}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>No shops yet</p>}
          <Link href="/shops" className={styles.viewAll}>View all shops →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🛒</span>
            <h3>Featured Products</h3>
          </div>
          {loadingProducts ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : products.length > 0 ? (
            <div className={styles.list}>
              {products.slice(0, 4).map(product => (
                <Link key={product.id} href={`/products/${product.id}`} className={styles.item}>
                  <span className={styles.itemIcon}>
                    {product.imageUrl ? <img src={product.imageUrl} alt="" /> : '🛒'}
                  </span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{product.title}</span>
                    <span className={styles.itemMeta}>by {product.user.name || 'Unknown'}</span>
                  </div>
                  {product.price && <span className={styles.itemPrice}>${product.price}</span>}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>No products yet</p>}
          <Link href="/products" className={styles.viewAll}>View all products →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>📝</span>
            <h3>Community Requests</h3>
          </div>
          {loadingRequests ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : requests.length > 0 ? (
            <div className={styles.list}>
              {requests.map(req => (
                <Link key={req.id} href={`/requests/${req.id}`} className={styles.item}>
                  <span className={styles.itemIcon}>📝</span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{req.title}</span>
                    <span className={styles.itemMeta}>by {req.user?.name || 'Unknown'}</span>
                  </div>
                  {req.goalAmount && (
                    <span className={styles.itemPrice}>
                      ${req.currentFunding || 0}/${req.goalAmount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>No requests yet</p>}
          <Link href="/requests" className={styles.viewAll}>View all requests →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>📅</span>
            <h3>Upcoming Events</h3>
          </div>
          {loadingEvents ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : events.length > 0 ? (
            <div className={styles.list}>
              {events.slice(0, 4).map(ev => (
                <Link key={ev.id} href={`/events/${ev.id}`} className={styles.item}>
                  <span className={styles.itemIcon}>📅</span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{ev.title}</span>
                    <span className={styles.itemMeta}>{ev.location || ev.eventCategory || 'Event'}</span>
                  </div>
                  {ev.eventDate && (
                    <span className={styles.itemPrice}>{new Date(ev.eventDate).toLocaleDateString()}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>No upcoming events</p>}
          <Link href="/events" className={styles.viewAll}>Explore events →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🚀</span>
            <h3>Active Projects</h3>
          </div>
          {loadingPlans ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : plans.length > 0 ? (
            <div className={styles.list}>
              {plans.slice(0, 4).map(plan => (
                <Link key={plan.id} href={`/plans/public?id=${plan.id}`} className={styles.item}>
                  <span className={styles.itemIcon}>🚀</span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{plan.title}</span>
                    <span className={styles.itemMeta}>by {plan.user?.name || 'Unknown'}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>No active projects</p>}
          <Link href="/plans/public" className={styles.viewAll}>Explore projects →</Link>
        </div>
      </div>

      {trendingTags && trendingTags.length > 0 && (
        <div className={styles.hashtagRow}>
          <div className={styles.hashtagRowHeader}>
            <span className={styles.hashtagRowIcon}>🏷️</span>
            <span>Trending Tags</span>
          </div>
          <div className={styles.hashtagRowCloud}>
            {trendingTags.slice(0, 8).map(h => (
              <Link key={h.tag} href={`/hashtag/${h.tag}`} className={styles.hashtagRowPill}>
                #{h.tag}
              </Link>
            ))}
            <Link href="/hashtags" className={styles.hashtagRowMore}>View All →</Link>
          </div>
        </div>
      )}
    </section>
  )
}
