import SearchResultsClient from './SearchResultsClient'
import { Suspense } from 'react'
import styles from './page.module.css'

export default function SearchPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading search...</div>}>
      <SearchResultsClient />
    </Suspense>
  )
}
