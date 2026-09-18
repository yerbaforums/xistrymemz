import Skeleton, { SkeletonList } from '@/components/Skeleton'

export default function DashboardFeedLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton width="40%" height="1.5rem" />
      <Skeleton width="100%" height="120px" borderRadius="12px" />
      <SkeletonList count={4} />
    </div>
  )
}