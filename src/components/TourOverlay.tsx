'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { TourStep, TourID } from '@/data/onboarding-tour'
import { useTour } from '@/hooks/useTour'
import styles from './TourOverlay.module.css'

const DISMISSED_KEY = (key: string) => `tour_${key}_dismissed`

interface TourOverlayProps {
  tourKey: TourID
  steps: TourStep[]
}

export default function TourOverlay({ tourKey, steps }: TourOverlayProps) {
  const router = useRouter()
  const { isActive, currentStep, next, back, skip, totalSteps } = useTour(tourKey, steps.length)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY(tourKey))
    if (stored === 'true') {
      setDontShowAgain(true)
    }
  }, [tourKey])

  const handleSkip = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(DISMISSED_KEY(tourKey), 'true')
    }
    skip()
  }, [dontShowAgain, skip, tourKey])

  const handleDone = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(DISMISSED_KEY(tourKey), 'true')
    }
    next()
  }, [dontShowAgain, next, tourKey])

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  const updatePosition = useCallback(() => {
    const s = steps[currentStep]
    if (!s?.target) {
      setTargetRect(null)
      if (s?.position === 'center') {
        setTooltipStyle({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' })
      } else {
        setTooltipStyle({})
      }
      return
    }

    const el = document.querySelector(s.target) as HTMLElement | null
    if (!el) {
      setTargetRect(null)
      setTooltipStyle({})
      return
    }

    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    const pos = s.position || 'bottom'

    const tooltip: React.CSSProperties = {}
    const gap = 12

    switch (pos) {
      case 'top':
        tooltip.left = rect.left + rect.width / 2
        tooltip.bottom = window.innerHeight - rect.top + gap
        break
      case 'bottom':
        tooltip.left = rect.left + rect.width / 2
        tooltip.top = rect.bottom + gap
        break
      case 'left':
        tooltip.right = window.innerWidth - rect.left + gap
        tooltip.top = rect.top + rect.height / 2
        break
      case 'right':
        tooltip.left = rect.right + gap
        tooltip.top = rect.top + rect.height / 2
        break
      case 'center':
        tooltip.left = '50%'
        tooltip.top = '50%'
        tooltip.transform = 'translate(-50%, -50%)'
        break
    }

    setTooltipStyle(tooltip)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentStep, steps])

  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => {
      updatePosition()
      setVisible(true)
    }, 200)

    window.addEventListener('resize', updatePosition)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePosition)
    }
  }, [updatePosition])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') back()
    }
    if (isActive) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isActive, next, back, handleSkip])

  if (!isActive || !step) return null

  const arrowPos = step.position || 'bottom'
  const arrowKey = `arrow${arrowPos.charAt(0).toUpperCase() + arrowPos.slice(1)}` as keyof typeof styles
  const arrowClass = step.target ? (styles[arrowKey] || styles.arrowBottom) : ''

  const handleAction = () => {
    if (step.action?.href) {
      router.push(step.action.href)
    }
    step.action?.onClick?.()
  }

  return (
    <div className={styles.overlay} style={{ opacity: visible ? 1 : 0 }}>
      {step.target && targetRect && (
        <div
          className={styles.spotlight}
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {!step.target && <div className={styles.backdrop} />}

      <div
        ref={tooltipRef}
        className={`${styles.tooltip} ${arrowClass}`}
        style={tooltipStyle}
      >
        <div className={styles.stepCounter}>
          Step {currentStep + 1} of {totalSteps}
          <div className={styles.dots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`} />
            ))}
          </div>
        </div>

        <div className={styles.stepTitle}>{step.title}</div>
        <div className={styles.stepDesc}>{step.description}</div>

        {step.action && (
          <button className={styles.actionBtn} onClick={handleAction}>
            {step.action.label}
          </button>
        )}

        <div className={styles.dismissRow}>
          <label className={styles.dismissLabel}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className={styles.dismissCheckbox}
            />
            Don't show again
          </label>
        </div>

        <div className={styles.nav}>
          <button className={styles.skipBtn} onClick={handleSkip}>Skip Tour</button>
          <div className={styles.navRight}>
            {!isFirst && (
              <button className={styles.navBtn} onClick={back}>← Back</button>
            )}
            <button className={styles.nextBtn} onClick={handleDone}>
              {isLast ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
