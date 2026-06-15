'use client'
import ErrorPage from '@/components/ErrorPage'
export default function PostError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorPage error={error} reset={reset} />
}
