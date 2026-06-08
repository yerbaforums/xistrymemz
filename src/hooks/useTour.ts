'use client'

import { useState, useEffect, useCallback } from 'react'

export function useTour(tourKey: string, totalSteps: number) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`tour_${tourKey}`)
    if (stored === 'completed' || stored === 'skipped') {
      setCompleted(true)
      return
    }
    const savedStep = stored ? parseInt(stored, 10) : 0
    if (!isNaN(savedStep) && savedStep > 0) {
      setCurrentStep(savedStep)
    }
    setIsActive(true)
  }, [tourKey])

  const next = useCallback(() => {
    setCurrentStep(prev => {
      const nextStep = prev + 1
      if (nextStep >= totalSteps) {
        localStorage.setItem(`tour_${tourKey}`, 'completed')
        setIsActive(false)
        setCompleted(true)
        return prev
      }
      localStorage.setItem(`tour_${tourKey}`, String(nextStep))
      return nextStep
    })
  }, [tourKey, totalSteps])

  const back = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }, [])

  const skip = useCallback(() => {
    localStorage.setItem(`tour_${tourKey}`, 'skipped')
    setIsActive(false)
    setCompleted(true)
  }, [tourKey])

  const restart = useCallback(() => {
    localStorage.removeItem(`tour_${tourKey}`)
    setCurrentStep(0)
    setCompleted(false)
    setIsActive(true)
  }, [tourKey])

  return { isActive, currentStep, next, back, skip, restart, completed, totalSteps }
}
