import Link from 'next/link'
import styles from './EmptyState.module.css'

interface ActionWithHref {
  label: string
  href: string
}

interface ActionWithOnClick {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ActionWithHref | ActionWithOnClick
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && 'href' in action ? (
        <Link href={action.href} className={styles.action} aria-label={action.label}>
          {action.label}
        </Link>
      ) : action && 'onClick' in action ? (
        <button className={styles.action} onClick={action.onClick} aria-label={action.label}>
          {action.label}
        </button>
      ) : null}
    </div>
  )
}