'use client'

import type { ReactNode } from 'react'
import styles from './FormField.module.css'

export function FormError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className={styles.error} role="alert">
      {children}
    </p>
  )
}

interface FormFieldProps {
  label?: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}

/**
 * Label + input + hinted/error state wrapper. Pair with FormInput/FormTextarea/
 * FormSelect (or any control) and an `htmlFor`/`id` match so the error message
 * is announced via aria-describedby.
 */
export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true"> *</span>
          )}
        </label>
      )}
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      <FormError id={error && htmlFor ? `${htmlFor}-error` : undefined}>{error}</FormError>
    </div>
  )
}