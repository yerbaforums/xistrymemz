'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import ConstellationMap from './ConstellationMap'
import PeopleYouMayKnow from './PeopleYouMayKnow'
import Loading from './Loading'
import type { ConstellationStar, ConstellationEdge, ConstellationCluster } from '@/lib/constellation'
import styles from './ConstellationExplorer.module.css'

interface ConstellationExplorerProps {
  height?: number
  showSuggestions?: boolean
  className?: string
}

export default function ConstellationExplorer({
  height = 560,
  showSuggestions = true,
  className,
}: ConstellationExplorerProps) {
  const { status } = useSession()
  const [stars, setStars] = useState<ConstellationStar[]>([])
  const [edges, setEdges] = useState<ConstellationEdge[]>([])
  const [clusters, setClusters] = useState<ConstellationCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStar, setSelectedStar] = useState<ConstellationStar | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/constellation?limit=120')
        if (!res.ok || cancelled) return
        const data = await res.json()
        const constData = data?.data || data
        setStars(constData.stars || [])
        setEdges(constData.edges || [])
        setClusters(constData.clusters || [])
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSelect = useCallback((star: ConstellationStar | null) => {
    setSelectedStar(star)
  }, [])

  if (loading) {
    return (
      <div className={`${styles.wrap} ${className || ''}`} style={{ height: Math.min(height, 320) }}>
        <div className={styles.loadingWrap}>
          <Loading size="medium" message="Charting the constellation…" />
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.wrap} ${className || ''}`}>
      <div className={styles.mapWrap} style={{ height }}>
        <ConstellationMap
          stars={stars}
          edges={edges}
          clusters={clusters}
          onSelectStar={handleSelect}
          selectedStarId={selectedStar?.id || null}
        />
      </div>
      {showSuggestions && status === 'authenticated' && (
        <div className={styles.suggestions}>
          <PeopleYouMayKnow limit={4} />
        </div>
      )}
    </div>
  )
}