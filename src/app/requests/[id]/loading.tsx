import styles from './page.module.css'

export default function Loading() {
  return (
    <div className={styles.page}>
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading request...
      </div>
    </div>
  )
}
