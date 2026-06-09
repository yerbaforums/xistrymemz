import SearchResultsClient from './SearchResultsClient'
import { Suspense } from 'react'
import Loading from '@/components/Loading'

export default function SearchPage() {
  return (
    <Suspense fallback={<Loading size="small" message="Loading search..." />}>
      <SearchResultsClient />
    </Suspense>
  )
}
