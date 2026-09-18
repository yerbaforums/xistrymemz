'use client'

import type { InputHTMLAttributes } from 'react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** When set, marks the input as invalid and wires aria-describedby to the matching FormField error. */
  error?: string
}

export default function FormInput({ error, id, className, ...props }: FormInputProps) {
  return (
    <input
      id={id}
      className={`input-field${className ? ` ${className}` : ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...props}
    />
  )
}