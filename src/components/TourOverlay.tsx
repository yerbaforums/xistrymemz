'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { TourStep, TourID } from '@/data/onboarding-tour'
import { useTour } from '@/hooks/useTour'
import styles from './TourOverlay.module.css'

interface TourOverlayProps {
  tourKey: TourID
  steps: TourStep[]
}

export default function TourOverlay({ tourKey, steps }: TourOverlayProps) {
  const { isActive, currentStep, next, back, skip, totalSteps } = useTour(tourKey, steps.length)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  const updatePosition = useCallback(() => {
    const s = steps[currentStep]
    if (!s?.target) {
      setTargetRect(null)
      setTooltipStyle({})
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

    const padding = s.spotlightPadding ?? 8
    const pos = s.position || 'bottom'
    const scrollX = window.scrollX
    const scrollY = window.scrollY

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
        tooltip.top = '40%'
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
      if (e.key === 'Escape') skip()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') back()
    }
    if (isActive) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isActive, next, back, skip])

  if (!isActive || !step) return null

  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        boxShadow: `rgba(0,0,0,0.7) 0px 0px 0px ${Math.max(window.innerWidth, window.innerHeight)}px`,
        clipPath: `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%,
          0% ${targetRect.top - 8}px,
          100% ${targetRect.top - 8}px,
          100% ${targetRect.bottom + 8}px,
          0% ${targetRect.bottom + 8}px,
          0% 0%
        )`,
      }
    : {}

  const arrowPos = step.position || 'bottom'
  const arrowKey = `arrow${arrowPos.charAt(0).toUpperCase() + arrowPos.slice(1)}` as keyof typeof styles
  const arrowClass = step.target ? (styles[arrowKey] || styles.arrowBottom) : ''

  const handleAction = () => {
    if (step.action?.href) {
      window.location.href = step.action.href
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

        <div className={styles.nav}>
          <button className={styles.skipBtn} onClick={skip}>Skip Tour</button>
          <div className={styles.navRight}>
            {!isFirst && (
              <button className={styles.navBtn} onClick={back}>← Back</button>
            )}
            <button className={styles.nextBtn} onClick={next}>
              {isLast ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
