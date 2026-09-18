import Skeleton, { SkeletonList } from '@/components/Skeleton'

export default function CommunityLoading() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton width="30%" height="1.5rem" />
      <SkeletonList count={8} />
    </div>
  )
}