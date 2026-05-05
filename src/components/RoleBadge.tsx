import styles from './RoleBadge.module.css'

interface RoleBadgeProps {
  role: string
  size?: 'mini' | 'small'
}

const ROLE_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  ADMIN: { label: 'ADMIN', emoji: '👑', className: styles.admin },
  MODERATOR: { label: 'MOD', emoji: '🛡️', className: styles.moderator },
  USER: { label: '', emoji: '', className: '' }
}

export default function RoleBadge({ role, size = 'mini' }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role]
  if (!config || !config.label) return null

  return (
    <span className={`${styles.badge} ${config.className} ${size === 'small' ? styles.small : ''}`} title={`${config.label} user`}>
      {config.emoji} {config.label}
    </span>
  )
}
