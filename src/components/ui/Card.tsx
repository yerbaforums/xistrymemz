'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'highlight'
  padding?: 'sm' | 'md' | 'lg'
  as?: 'div' | 'section' | 'article'
  header?: ReactNode
  footer?: ReactNode
}

export default function Card({
  variant = 'default',
  padding = 'md',
  as: Tag = 'div',
  header,
  footer,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <Tag className={`${styles.card} ${styles[variant]} ${styles[`pad-${padding}`]} ${className}`} {...rest}>
      {header && <div className={styles.header}>{header}</div>}
      {children}
      {footer && <div className={styles.footer}>{footer}</div>}
    </Tag>
  )
}
