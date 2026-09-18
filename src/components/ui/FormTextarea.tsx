'use client'

import type { TextareaHTMLAttributes } from 'react'

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** When set, marks the textarea as invalid and wires aria-describedby to the matching FormField error. */
  error?: string
}

export default function FormTextarea({ error, id, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      id={id}
      className={`textarea-field${className ? ` ${className}` : ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error && id ? `${id}-error` : undefined}
      {...props}
    />
  )
}