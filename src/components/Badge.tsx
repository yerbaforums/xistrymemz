'use client'

interface Badge {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  tier: string
}

interface BadgeDisplayProps {
  badges: Badge[]
  showCount?: number
}

const BADGE_ICONS: Record<string, string> = {
  EARLY_ADOPTER: '🌱',
  TRUSTED_CONNECTOR: '🤝',
  VERIFIED_SELLER: '💎',
  COMMUNITY_BUILDER: '🏗️',
  MENTOR: '📚',
  GUIDE: '🧭',
  PIONEER: '🚀',
  EARTH_GUARDIAN: '🌍',
  HERO: '🦸',
  ARTIST: '🎨',
  WIZARD: '🧙',
  VISIONARY: '💫'
}

const BADGE_COLORS: Record<string, { bg: string, text: string }> = {
  BRONZE: { bg: 'rgba(205, 127, 50, 0.2)', text: '#cd7f32' },
  SILVER: { bg: 'rgba(192, 192, 192, 0.2)', text: '#c0c0c0' },
  GOLD: { bg: 'rgba(255, 215, 0, 0.2)', text: '#ffd700' },
  PLATINUM: { bg: 'rgba(0, 191, 255, 0.2)', text: '#00bfff' },
  DIAMOND: { bg: 'rgba(255, 255, 255, 0.2)', text: '#ffffff' }
}

export default function BadgeDisplay({ badges, showCount = 6 }: BadgeDisplayProps) {
  const displayBadges = badges.slice(0, showCount)
  const remaining = badges.length - showCount

  if (badges.length === 0) {
    return null
  }

  return (
    <div className="badge-display">
      <div className="badge-grid">
        {displayBadges.map(badge => (
          <div 
            key={badge.id} 
            className="badge-item"
            title={badge.description || badge.name}
            style={{ 
              '--badge-bg': BADGE_COLORS[badge.tier]?.bg || 'rgba(128, 128, 128, 0.2)',
              '--badge-text': BADGE_COLORS[badge.tier]?.text || '#888'
            } as React.CSSProperties}
          >
            <span className="badge-icon">{BADGE_ICONS[badge.name] || '🏅'}</span>
            <span className="badge-name">{badge.name.replace(/_/g, ' ')}</span>
            <span className="badge-tier">{badge.tier}</span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="badge-more">
            +{remaining} more
          </div>
        )}
      </div>

      <style jsx>{`
        .badge-display {
          margin: 16px 0;
        }
        
        .badge-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .badge-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--badge-bg);
          border: 1px solid var(--badge-text);
          border-radius: 20px;
          font-size: 11px;
        }
        
        .badge-icon {
          font-size: 14px;
        }
        
        .badge-name {
          color: var(--badge-text);
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .badge-tier {
          font-size: 9px;
          padding: 2px 4px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          color: var(--badge-text);
          text-transform: uppercase;
        }
        
        .badge-more {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background: var(--bg-tertiary, #333);
          border-radius: 20px;
          font-size: 11px;
          color: var(--text-secondary, #888);
        }
      `}</style>
    </div>
  )
}