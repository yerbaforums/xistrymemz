'use client';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '1rem',
      background: '#161616',
      borderRadius: '12px',
      border: '1px solid #ff3366'
    }}>
      <span style={{ fontSize: '2rem' }}>⚠️</span>
      <p style={{ color: '#ff3366', margin: 0 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.5rem 1rem',
            background: '#00d9ff',
            color: '#0d0d0d',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}