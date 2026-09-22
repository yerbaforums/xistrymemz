import Link from 'next/link'

interface HashtagChipsProps {
  tags?: string[] | null
  /** Max chips to render before "+N". Defaults to 3. */
  max?: number
  /** Smallest variant for compact card footers. Defaults to false. */
  small?: boolean
  className?: string
}

/**
 * Renders hashtags as small link chips (#tag) pointing at the hashtag page.
 * Shared by Discover, Directory, and card grids so styling stays consistent.
 */
export default function HashtagChips({ tags, max = 3, small = false, className }: HashtagChipsProps) {
  const list = (tags || []).filter(Boolean)
  if (list.length === 0) return null

  const shown = list.slice(0, max)
  const rest = list.length - shown.length

  return (
    <span className={className} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {shown.map(tag => (
        <Link
          key={tag}
          href={`/hashtag/${encodeURIComponent(tag.toLowerCase())}`}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: small ? '0.68rem' : '0.72rem',
            lineHeight: 1,
            padding: small ? '3px 6px' : '4px 8px',
            borderRadius: 999,
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          #{tag}
        </Link>
      ))}
      {rest > 0 && (
        <span style={{ fontSize: small ? '0.65rem' : '0.7rem', color: 'var(--text-muted)' }}>+{rest}</span>
      )}
    </span>
  )
}