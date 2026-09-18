import Skeleton, { SkeletonList } from '@/components/Skeleton'

export default function SearchLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton width="25%" height="1.5rem" />
      <Skeleton width="100%" height="52px" borderRadius="12px" />
      <SkeletonList count={5} />
    </div>
  )
}