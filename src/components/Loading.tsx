'use client';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function Loading({ message = 'Loading...', size = 'medium' }: LoadingProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: size === 'small' ? '1rem' : size === 'large' ? '4rem' : '2rem',
      gap: '1rem'
    }}>
      <div style={{
        width: size === 'small' ? '24px' : size === 'large' ? '60px' : '40px',
        height: size === 'small' ? '24px' : size === 'large' ? '60px' : '40px',
        border: `${size === 'small' ? '2px' : size === 'large' ? '4px' : '3px'} solid #2a2a2a`,
        borderTopColor: '#00d9ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      {message && <p style={{ color: '#888888', margin: 0, fontSize: '0.875rem' }}>{message}</p>}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}