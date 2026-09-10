'use client'

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
}

interface QualityBadgeProps {
  badge: { name: string; tier: string; description?: string | null; imageUrl?: string | null }
  size?: 'sm' | 'md'
}

export default function QualityBadge({ badge, size = 'md' }: QualityBadgeProps) {
  const color = TIER_COLORS[badge.tier] || TIER_COLORS.BRONZE
  const isSmall = size === 'sm'
  const fontSize = isSmall ? 10 : 12
  const padding = isSmall ? '2px 6px' : '3px 10px'
  const imgSize = isSmall ? 14 : 18
  const tooltip = [badge.name, badge.description].filter(Boolean).join(' — ')

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        borderRadius: 12,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.3px',
        color: '#fff',
        background: `${color}22`,
        border: `1px solid ${color}66`,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {badge.imageUrl ? (
        <img
          src={badge.imageUrl}
          alt=""
          width={imgSize}
          height={imgSize}
          style={{ borderRadius: '50%' }}
        />
      ) : (
        <span style={{ fontSize: isSmall ? 10 : 12 }}>
          {badge.tier === 'DIAMOND' ? '💎' : badge.tier === 'PLATINUM' ? '🤍' : badge.tier === 'GOLD' ? '🥇' : badge.tier === 'SILVER' ? '🥈' : '🥉'}
        </span>
      )}
      <span style={{ color }}>{badge.name}</span>
    </span>
  )
}
