interface Props {
  size?: 'sm' | 'md'
}

export default function LookingForCollaboratorsBadge({ size = 'sm' }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
        fontWeight: 600,
        color: '#6366f1',
        background: '#eef2ff',
        padding: '2px 6px',
        borderRadius: 6,
        whiteSpace: 'nowrap',
      }}
    >
      🤝 Looking for collaborators
    </span>
  )
}
