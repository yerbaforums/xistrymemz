'use client'

import { useToast } from '@/context/ToastContext'
import styles from './Toast.module.css'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }; onDismiss: () => void }) {
  const icons: Record<string, string> = {
    success: '\u2713',
    error: '\u2715',
    warning: '\u26A0',
    info: '\u2139',
  }

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert">
      <span className={styles.icon}>{icons[toast.type] || '\u2139'}</span>
      <span className={styles.message}>{toast.message}</span>
      <button 
        className={styles.dismiss} 
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        \u2715
      </button>
    </div>
  )
}