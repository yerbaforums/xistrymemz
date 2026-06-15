'use client'
import ErrorPage from '@/components/ErrorPage'
export default function ProductError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorPage error={error} reset={reset} />
}
