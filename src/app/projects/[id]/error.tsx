'use client'

import styles from './page.module.css'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.page}>
      <div className={styles.projectDetail}>
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error.message}</p>
          <button onClick={reset} className="btn-primary">Try again</button>
        </div>
      </div>
    </div>
  )
}
