import styles from './page.module.css'

export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.backLink}>&larr; Back to Projects</div>
      <div className={styles.projectDetail}>
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading project...
        </div>
      </div>
    </div>
  )
}
