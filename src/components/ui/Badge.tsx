'use client'

import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
}

const VARIANT_MAP: Record<string, string> = {
  default: styles.default,
  primary: styles.primary,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  info: styles.info,
}

export default function Badge({ variant = 'default', size = 'sm', children, className = '' }: Props) {
  return (
    <span className={`${styles.badge} ${VARIANT_MAP[variant]} ${styles[size]} ${className}`}>
      {children}
    </span>
  )
}
