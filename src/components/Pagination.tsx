import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={styles.pagination}>
      <span className={styles.info}>{total} total</span>
      <div className={styles.buttons}>
        <button className={styles.btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
        <span className={styles.indicator}>Page {page} of {totalPages}</span>
        <button className={styles.btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</button>
      </div>
    </div>
  )
}
