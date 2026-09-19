'use client'

import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import type { FeaturedShop, FeaturedProduct, PublicRequest, FeaturedEvent, PublicProject, FeaturedBoard, FeaturedBlog, FeaturedPodcast, FeaturedService } from './types'
import { useTranslations } from 'next-intl'
import styles from './PulseSection.module.css'

interface Props {
  shops: FeaturedShop[]
  products: FeaturedProduct[]
  requests: PublicRequest[]
  events: FeaturedEvent[]
  projects: PublicProject[]
  boards: FeaturedBoard[]
  blogs: FeaturedBlog[]
  podcasts: FeaturedPodcast[]
  services: FeaturedService[]
  loadingShops: boolean
  loadingProducts: boolean
  loadingRequests: boolean
  loadingEvents: boolean
  loadingPlans: boolean
  loadingBoards: boolean
  loadingBlogs: boolean
  loadingPodcasts: boolean
  loadingServices: boolean
}

export default function PulseSection({ shops, products, requests, events, projects, boards, blogs, podcasts, services, loadingShops, loadingProducts, loadingRequests, loadingEvents, loadingPlans, loadingBoards, loadingBlogs, loadingPodcasts, loadingServices }: Props) {
  const { ref, visible } = useScrollReveal()
  const t = useTranslations('home')

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>{t('pulseTitle')}</h2>
      <p className={styles.sectionSubtitle}>{t('pulseSubtitle')}</p>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🏪</span>
            <h3>{t('latestShops')}</h3>
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
          ) : <p className={styles.empty}>{t('noShopsYet')}</p>}
          <Link href="/shops" className={styles.viewAll}>{t('viewAllShops')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🛒</span>
            <h3>{t('featuredProducts')}</h3>
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
                    <span className={styles.itemMeta}>{t('byLabel')} {product.user.name || 'Unknown'}</span>
                  </div>
                  {product.price && <span className={styles.itemPrice}>${product.price}</span>}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noProductsYet')}</p>}
          <Link href="/products" className={styles.viewAll}>{t('viewAllProducts')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>📝</span>
            <h3>{t('communityRequests')}</h3>
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
                    <span className={styles.itemMeta}>{t('byLabel')} {req.user?.name || 'Unknown'}</span>
                  </div>
                  {req.goalAmount && (
                    <span className={styles.itemPrice}>
                      ${req.currentFunding || 0}/${req.goalAmount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noRequestsYet')}</p>}
          <Link href="/requests" className={styles.viewAll}>{t('viewAllRequests')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>📅</span>
            <h3>{t('upcomingEvents')}</h3>
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
                    <span className={styles.itemMeta}>{ev.location || ev.eventCategory || t('eventLabel')}</span>
                  </div>
                  {ev.eventDate && (
                    <span className={styles.itemPrice}>{new Date(ev.eventDate).toLocaleDateString()}</span>
                  )}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noEventsYet')}</p>}
          <Link href="/events" className={styles.viewAll}>{t('exploreEvents')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🚀</span>
            <h3>{t('activeProjects')}</h3>
          </div>
          {loadingPlans ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : projects.length > 0 ? (
            <div className={styles.list}>
              {projects.slice(0, 4).map(project => (
                <Link key={project.id} href={`/projects?id=${project.id}`} className={styles.item}>
                  <span className={styles.itemIcon}>🚀</span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{project.title}</span>
                    <span className={styles.itemMeta}>{t('byLabel')} {project.user?.name || 'Unknown'}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noProjectsYet')}</p>}
          <Link href="/projects" className={styles.viewAll}>{t('exploreProjects')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>📌</span>
            <h3>{t('communityBoards')}</h3>
          </div>
          {loadingBoards ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : boards.length > 0 ? (
            <div className={styles.list}>
              {boards.slice(0, 4).map(board => (
                <Link key={board.id} href={`/boards/${board.slug}`} className={styles.item}>
                  <span className={styles.itemIcon}>📌</span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{board.name}</span>
                    <span className={styles.itemMeta}>{board.location || '📍 ' + board.pinCount + ' pins'}</span>
                  </div>
                  <span className={styles.itemPrice}>{board.pinCount}</span>
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noBoardsYet')}</p>}
          <Link href="/boards" className={styles.viewAll}>{t('exploreBoards')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>✍️</span>
            <h3>{t('latestBlogs')}</h3>
          </div>
          {loadingBlogs ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : blogs.length > 0 ? (
            <div className={styles.list}>
              {blogs.slice(0, 4).map(blog => (
                <Link key={blog.id} href={`/blog/${blog.blogSlug}`} className={styles.item}>
                  <span className={styles.itemIcon}>
                    {blog.blogImage ? <img src={blog.blogImage} alt="" /> : '✍️'}
                  </span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{blog.blogName || blog.name || 'Untitled'}</span>
                    <span className={styles.itemMeta}>{blog.blogTagline || `${t('byLabel')} ${blog.name || 'Unknown'}`}</span>
                  </div>
                  {blog._count && <span className={styles.itemPrice}>{blog._count.blogPosts}</span>}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noBlogsYet')}</p>}
          <Link href="/blogs" className={styles.viewAll}>{t('viewAllBlogs')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🎙️</span>
            <h3>{t('latestPodcasts')}</h3>
          </div>
          {loadingPodcasts ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : podcasts.length > 0 ? (
            <div className={styles.list}>
              {podcasts.slice(0, 4).map(podcast => (
                <Link key={podcast.id} href={`/podcast/${podcast.podcastSlug}`} className={styles.item}>
                  <span className={styles.itemIcon}>
                    {podcast.podcastImage ? <img src={podcast.podcastImage} alt="" /> : '🎙️'}
                  </span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{podcast.podcastName || podcast.name || 'Untitled'}</span>
                    <span className={styles.itemMeta}>{podcast.isLive ? `🔴 LIVE · ${t('byLabel')} ${podcast.name || 'Unknown'}` : `${t('byLabel')} ${podcast.name || 'Unknown'}`}</span>
                  </div>
                  {podcast._count && <span className={styles.itemPrice}>{podcast._count.podcastEpisodes}</span>}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noPodcastsYet')}</p>}
          <Link href="/podcasts" className={styles.viewAll}>{t('viewAllPodcasts')} →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.icon}>🔧</span>
            <h3>{t('latestServices')}</h3>
          </div>
          {loadingServices ? (
            <div className={styles.list}>{[1,2,3].map(i => <Skeleton key={i} width="100%" height="2.5rem" />)}</div>
          ) : services.length > 0 ? (
            <div className={styles.list}>
              {services.slice(0, 4).map(service => (
                <Link key={service.id} href={`/services/${service.id}`} className={styles.item}>
                  <span className={styles.itemIcon}>🔧</span>
                  <div className={styles.itemCol}>
                    <span className={styles.itemTitle}>{service.title}</span>
                    <span className={styles.itemMeta}>{service.category || `${t('byLabel')} ${service.user?.name || 'Unknown'}`}</span>
                  </div>
                  {service.price != null && <span className={styles.itemPrice}>${service.price}</span>}
                </Link>
              ))}
            </div>
          ) : <p className={styles.empty}>{t('noServicesYet')}</p>}
          <Link href="/services" className={styles.viewAll}>{t('viewAllServices')} →</Link>
        </div>
      </div>
    </section>
  )
}
