'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import styles from './HashtagSection.module.css'

interface HashtagEntity {
  tag: string
  postCount: number
  entities?: {
    posts: number
    products: number
    events: number
    forumPosts: number
    groupPosts: number
  }
}

interface Props {
  tags: HashtagEntity[]
}

export default function HashtagSection({ tags }: Props) {
  const t = useTranslations('home')

  if (tags.length === 0) return null

  const maxCount = Math.max(...tags.map(t => t.postCount))
  const totalEntities = (t: HashtagEntity) =>
    (t.entities?.posts || 0) + (t.entities?.products || 0) + (t.entities?.events || 0) +
    (t.entities?.forumPosts || 0) + (t.entities?.groupPosts || 0)

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('trendingHashtags')}</h2>
      <div className={styles.cloud}>
        {tags.map((h, i) => {
          const size = 0.8 + (h.postCount / maxCount) * 0.6
          return (
            <Link
              key={h.tag}
              href={`/hashtag/${h.tag}`}
              className={styles.pill}
              style={{ fontSize: `${size}rem`, animationDelay: `${i * 40}ms` }}
            >
              <span>#{h.tag}</span>
              {h.entities && (
                <span className={styles.count}>{totalEntities(h)}</span>
              )}
              {!h.entities && (
                <span className={styles.count}>{h.postCount}</span>
              )}
              {h.entities && h.entities.products > 0 && (
                <span className={styles.entityBadge} title={t('productsLabel')}>{h.entities.products}pr</span>
              )}
              {h.entities && h.entities.events > 0 && (
                <span className={styles.entityBadge} title={t('eventsLabel')}>{h.entities.events}ev</span>
              )}
            </Link>
          )
        })}
      </div>
      <div className={styles.footerLink}>
        <Link href="/hashtags" className={styles.exploreLink}>
          {t('exploreAllHashtags')} →
        </Link>
      </div>
    </section>
  )
}
