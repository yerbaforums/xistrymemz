import styles from './StatsCard.module.css'

export default function StatsCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className={styles.card}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.value}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
