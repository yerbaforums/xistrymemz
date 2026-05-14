'use client'

import Link from 'next/link'
import styles from './HashtagSection.module.css'

interface Props {
  tags: { tag: string; postCount: number }[]
}

export default function HashtagSection({ tags }: Props) {
  if (tags.length === 0) return null

  const maxCount = Math.max(...tags.map(t => t.postCount))

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Trending Hashtags</h2>
      <div className={styles.cloud}>
        {tags.map(h => {
          const size = 0.8 + (h.postCount / maxCount) * 0.6
          return (
            <Link
              key={h.tag}
              href={`/hashtag/${h.tag}`}
              className={styles.pill}
              style={{ fontSize: `${size}rem` }}
            >
              <span>#{h.tag}</span>
              <span className={styles.count}>{h.postCount}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
