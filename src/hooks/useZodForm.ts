'use client'

import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import type { z } from 'zod'

export type FormErrors<T> = Partial<Record<keyof T, string>>

interface UseZodFormOptions {
  /** Re-validate the edited field on every change (default: false, validate on submit only). */
  validateOnChange?: boolean
}

export interface UseZodFormResult<T extends object> {
  values: T
  errors: FormErrors<T>
  setValue: <K extends keyof T>(key: K, value: T[K], opts?: { validate?: boolean }) => void
  setValues: (next: T) => void
  /** Merge several fields in one state update (safe to call several times per handler). */
  patch: (partial: Partial<T>) => void
  validate: () => boolean
  reset: () => void
  handleSubmit: (onValid: (values: T) => void | Promise<void>) => (e: FormEvent) => Promise<void>
}

/**
 * Lightweight client-side form state backed by a zod schema.
 *
 * Designed for the app's existing manual `useState` forms: keep the same
 * controlled inputs, but swap the "check a couple of fields on submit" logic
 * for schema-driven validation with per-field error messages.
 *
 * @example
 * const { values, errors, setValue, handleSubmit } = useZodForm(mySchema, defaultValues)
 * <FormField label="Title" error={errors.title} htmlFor="title" required>
 *   <FormInput id="title" value={values.title} onChange={e => setValue('title', e.target.value)} />
 * </FormField>
 */
export function useZodForm<T extends object>(
  schema: z.ZodType<unknown>,
  defaultValues: T,
  options?: UseZodFormOptions,
): UseZodFormResult<T> {
  const [values, setValuesState] = useState<T>(defaultValues)
  const [errors, setErrors] = useState<FormErrors<T>>({})

  const toErrors = useCallback((data: T): FormErrors<T> => {
    const result = schema.safeParse(data as unknown)
    const map: FormErrors<T> = {}
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !(key in map)) {
          map[key as keyof T] = issue.message
        }
      }
    }
    return map
  }, [schema])

  const validate = useCallback((): boolean => {
    const nextErrors = toErrors(values)
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [toErrors, values])

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K], opts?: { validate?: boolean }) => {
    const next = { ...values, [key]: value }
    setValuesState(next)
    if (opts?.validate || options?.validateOnChange) {
      setErrors(prev => {
        const fieldErrors = toErrors(next)
        const withoutField = { ...prev }
        delete withoutField[key]
        const fieldError = fieldErrors[key]
        return fieldError ? { ...withoutField, [key]: fieldError } : withoutField
      })
    }
  }, [values, toErrors, options?.validateOnChange])

  const setValues = useCallback((next: T) => {
    setValuesState(next)
  }, [])

  const patch = useCallback((partial: Partial<T>) => {
    const next = { ...values, ...partial }
    setValuesState(next)
    if (options?.validateOnChange) setErrors(toErrors(next))
  }, [values, toErrors, options?.validateOnChange])

  const reset = useCallback(() => {
    setValuesState(defaultValues)
    setErrors({})
  }, [defaultValues])

  const handleSubmit = useCallback(
    (onValid: (values: T) => void | Promise<void>) =>
      async (e: FormEvent) => {
        e.preventDefault()
        const valid = validate()
        if (valid) await onValid(values)
      },
    [validate, values],
  )

  return { values, errors, setValue, setValues, patch, validate, reset, handleSubmit }
}