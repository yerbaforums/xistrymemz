'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/context/ToastContext'
import styles from './TicketScanModal.module.css'

interface ScannedTicket {
  ticketCode: string
  paymentStatus: string
  quantity: number
  user: { name: string | null }
  event: { title: string }
}

interface TicketScanModalProps {
  eventId: string
  onClose: () => void
}

export default function TicketScanModal({ eventId, onClose }: TicketScanModalProps) {
  const { success, error: toastError } = useToast()
  const [mode, setMode] = useState<'scan' | 'manual' | 'result'>('scan')
  const [manualCode, setManualCode] = useState('')
  const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scannerLoading, setScannerLoading] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const loadHtml5Qrcode = useCallback(async () => {
    setScannerLoading(true)
    try {
      const mod = await import('html5-qrcode')
      return mod.Html5Qrcode
    } catch {
      toastError('Camera not available. Try manual entry.')
      setMode('manual')
      return null
    } finally {
      setScannerLoading(false)
    }
  }, [])

  const startScanner = useCallback(async () => {
    const Html5Qrcode = await loadHtml5Qrcode()
    if (!Html5Qrcode || !scannerContainerRef.current) return

    const scanner = new Html5Qrcode('ticket-scanner')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          setScanning(true)
          try {
            const code = extractTicketCode(decodedText)
            if (code) {
              await handleLookup(code)
              await scanner.stop()
            }
          } catch { /* continue scanning */ }
          setScanning(false)
        },
        () => { /* no scan callback */ }
      )
    } catch {
      toastError('Could not access camera')
      setMode('manual')
    }
  }, [loadHtml5Qrcode, eventId])

  useEffect(() => {
    if (mode === 'scan') {
      startScanner()
      return () => {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {})
        }
      }
    }
  }, [mode])

  function extractTicketCode(text: string): string | null {
    try {
      const url = new URL(text)
      const parts = url.pathname.split('/')
      return parts[parts.length - 1] || null
    } catch {
      if (/^[a-zA-Z0-9_-]{10,}$/.test(text.trim())) {
        return text.trim()
      }
      return null
    }
  }

  async function handleLookup(code: string) {
    try {
      const res = await fetch(`/api/tickets/${code}`)
      if (!res.ok) {
        toastError('Ticket not found')
        return
      }
      const data = await res.json()
      const ticket = data?.data?.ticket || data?.ticket
      if (ticket.event.id !== eventId) {
        toastError('This ticket is for a different event')
        return
      }
      setScannedTicket(ticket)
      setMode('result')
    } catch {
      toastError('Failed to look up ticket')
    }
  }

  async function handleScan() {
    if (!scannedTicket) return
    try {
      const res = await fetch(`/api/tickets/${scannedTicket.ticketCode}/scan`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        success(data?.data?.message || 'Ticket verified!')
        setScannedTicket(prev => prev ? { ...prev, paymentStatus: 'APPROVED' } : null)
      } else {
        const data = await res.json()
        toastError(data?.data?.error || data?.error || 'Failed to approve ticket')
      }
    } catch {
      toastError('Failed to approve ticket')
    }
  }

  function handleScanNext() {
    setScannedTicket(null)
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setMode('scan')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📷 Scan Tickets</h3>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${mode === 'scan' ? styles.tabActive : ''}`} onClick={() => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); scannerRef.current = null; setMode('scan') }}>
              Camera
            </button>
            <button className={`${styles.tab} ${mode === 'manual' || mode === 'result' ? styles.tabActive : ''}`} onClick={() => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); scannerRef.current = null; setMode('manual') }}>
              Manual
            </button>
          </div>

          {mode === 'scan' && (
            <div className={styles.scannerArea}>
              {scannerLoading && <p className={styles.scanHint}>Starting camera...</p>}
              <div id="ticket-scanner" ref={scannerContainerRef} className={styles.scanner} />
              {scanning && <p className={styles.scanHint}>Scanning...</p>}
            </div>
          )}

          {mode === 'manual' && (
            <div className={styles.manualEntry}>
              <label>Enter ticket code</label>
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Paste ticket code or URL..."
                className={styles.input}
                onKeyDown={e => { if (e.key === 'Enter') handleLookup(manualCode.trim()) }}
              />
              <button onClick={() => handleLookup(manualCode.trim())} disabled={!manualCode.trim()} className={styles.lookupBtn}>
                Look Up
              </button>
            </div>
          )}

          {mode === 'result' && scannedTicket && (
            <div className={styles.resultCard}>
              <div className={`${styles.resultStatus} ${
                scannedTicket.paymentStatus === 'APPROVED' ? styles.statusUsed :
                scannedTicket.paymentStatus === 'PAID' ? styles.statusValid :
                scannedTicket.paymentStatus === 'PENDING' ? styles.statusPending :
                styles.statusCancelled
              }`}>
                {scannedTicket.paymentStatus === 'APPROVED' ? 'Already Used' :
                 scannedTicket.paymentStatus === 'PAID' ? 'Valid - Ready' :
                 scannedTicket.paymentStatus === 'PENDING' ? 'Payment Pending' :
                 'Invalid'}
              </div>
              <div className={styles.resultInfo}>
                <strong>{scannedTicket.user.name || 'Unknown'}</strong>
                <span>×{scannedTicket.quantity}</span>
                <code className={styles.resultCode}>{scannedTicket.ticketCode.slice(0, 8)}</code>
              </div>
              <div className={styles.resultActions}>
                {scannedTicket.paymentStatus === 'PAID' && (
                  <button onClick={handleScan} className={styles.approveBtn}>Approve Entry</button>
                )}
                <button onClick={handleScanNext} className={styles.nextBtn}>Scan Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
