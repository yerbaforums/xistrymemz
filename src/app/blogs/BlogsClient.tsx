'use client'

import { useMemo, useCallback, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import AlphabeticalIndex, { type IndexItem } from '@/components/AlphabeticalIndex'
import { EmptyState } from '@/components/EmptyState'

interface Blog {
  id: string
  blogName: string | null
  blogAbout: string | null
  blogImage: string | null
  blogCoverImage: string | null
  blogSlug: string
  blogTagline: string | null
  name: string | null
  username: string | null
  image: string | null
  location: string | null
  latestPost: { title: string; excerpt: string | null; publishedAt: string | null } | null
  _count?: { blogPosts: number }
}

interface BlogsClientProps {
  initialBlogs: Blog[]
}

export function BlogsClient({ initialBlogs }: BlogsClientProps) {
  const [blogs] = useState<Blog[]>(initialBlogs)
  const [search, setSearch] = useState('')

  const filteredBlogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return blogs
    return blogs.filter(b =>
      (b.blogName || b.name || '').toLowerCase().includes(q) ||
      (b.blogAbout || '').toLowerCase().includes(q) ||
      (b.blogTagline || '').toLowerCase().includes(q) ||
      (b.username || b.name || '').toLowerCase().includes(q)
    )
  }, [blogs, search])

  const indexItems: IndexItem[] = useMemo(
    () =>
      filteredBlogs.map((b) => ({
        id: b.id,
        label: b.blogName || b.name || 'Untitled',
        sortKey: b.blogName || b.name || 'Untitled',
      })),
    [filteredBlogs]
  )

  const renderBlog = useCallback(
    (item: IndexItem) => {
      const b = blogs.find((x) => x.id === item.id)!
      return (
        <Link key={b.id} href={`/blog/${b.blogSlug}`} className={styles.blogCard}>
          {b.blogCoverImage ? (
            <div className={styles.cardCover}>
              <img src={b.blogCoverImage} alt="" />
            </div>
          ) : (
            <div className={`${styles.cardCover} ${styles.coverGradient}`}>
              <span className={styles.coverInitial}>{(b.blogName || b.name || 'B')[0].toUpperCase()}</span>
            </div>
          )}
          <div className={styles.cardBody}>
            <div className={styles.cardTop}>
              {b.blogImage ? (
                <img src={b.blogImage} alt="" className={styles.cardAvatar} />
              ) : (
                <span className={styles.cardAvatarPlaceholder}>{(b.blogName || b.name || 'B')[0].toUpperCase()}</span>
              )}
              <div className={styles.cardTitleWrap}>
                <h3 className={styles.cardTitle}>{b.blogName || b.name || 'Untitled'}</h3>
                {b.location && <span className={styles.cardLocation}>📍 {b.location}</span>}
              </div>
            </div>
            <p className={styles.cardDesc}>{b.blogTagline || b.blogAbout || (b._count?.blogPosts ? `${b._count.blogPosts} posts` : 'A blog on XistrYmemZ')}</p>
            {b.latestPost && (
              <div className={styles.latestPost}>
                <span className={styles.latestLabel}>Latest</span>
                <span className={styles.latestTitle}>{b.latestPost.title}</span>
              </div>
            )}
            <div className={styles.cardFooter}>
              <span className={styles.postCount}>{b._count?.blogPosts ?? 0} posts</span>
              <span className={styles.readMore}>Read →</span>
            </div>
          </div>
        </Link>
      )
    },
    [blogs]
  )

  if (blogs.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="No blogs yet"
        description="Be the first to start a blog and share long-form writing with the community."
        action={{ label: 'Start a blog', href: '/blog/setup' }}
      />
    )
  }

  return (
    <div>
      <div className={styles.searchBar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search blogs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search blogs"
        />
      </div>
      {indexItems.length === 0 ? (
        <EmptyState
          icon="✍️"
          title="No blogs match"
          description={search ? `Nothing found for "${search}".` : 'No blogs yet.'}
          action={search ? { label: 'Clear search', onClick: () => setSearch('') } : undefined}
        />
      ) : (
        <AlphabeticalIndex
          items={indexItems}
          renderCard={renderBlog}
          sidebarTitle="Blogs"
        />
      )}
    </div>
  )
}