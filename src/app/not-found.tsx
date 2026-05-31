import Link from 'next/link'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <span className={styles.icon}>🔮</span>
        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>This page doesn&apos;t exist</p>
        <p className={styles.description}>The link might be broken, or the page may have been removed.</p>
        <form action="/search" method="GET" className={styles.searchForm}>
          <input type="text" name="q" placeholder="Search the site..." className={styles.searchInput} required minLength={2} />
          <button type="submit" className={styles.searchBtn}>Search</button>
        </form>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryBtn}>Go Home</Link>
          <Link href="/dashboard" className={styles.secondaryBtn}>Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
