'use client'

import type { SelectHTMLAttributes } from 'react'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** When set, marks the select as invalid and wires aria-describedby to the matching FormField error. */
  error?: string
}

export default function FormSelect({ error, id, className, ...props }: FormSelectProps) {
  return (
    <select
      id={id}
      className={`select-field${className ? ` ${className}` : ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...props}
    />
  )
}