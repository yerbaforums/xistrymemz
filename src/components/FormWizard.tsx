'use client'

import { useState, ReactNode } from 'react'
import styles from './FormWizard.module.css'

export interface WizardStep {
  key: string
  label: string
  icon?: string
  optional?: boolean
}

interface FormWizardProps {
  steps: WizardStep[]
  currentStep: string
  onStepChange: (step: string) => void
  children: ReactNode
  onNext?: () => void
  onBack?: () => void
  onSkip?: () => void
  onSubmit?: () => void
  isFirstStep: boolean
  isLastStep: boolean
  loading?: boolean
  submitLabel?: string
  showSkip?: boolean
}

export default function FormWizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onNext,
  onBack,
  onSkip,
  onSubmit,
  isFirstStep,
  isLastStep,
  loading = false,
  submitLabel = 'Submit',
  showSkip = false
}: FormWizardProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep)
  const progress = ((currentIndex) / (steps.length - 1)) * 100

  return (
    <div className={styles.wizard}>
      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.stepDots}>
          {steps.map((step, i) => (
            <button
              key={step.key}
              className={`${styles.stepDot} ${i < currentIndex ? styles.completed : ''} ${i === currentIndex ? styles.active : ''}`}
              onClick={() => i < currentIndex && onStepChange(step.key)}
              disabled={i > currentIndex}
              aria-label={`Go to ${step.label}`}
            >
              <span className={styles.dotNumber}>{i + 1}</span>
              <span className={styles.dotLabel}>{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.content}>
        {children}
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <div className={styles.navLeft}>
          {!isFirstStep && (
            <button 
              onClick={onBack}
              className="btn-ghost"
              disabled={loading}
            >
              ← Back
            </button>
          )}
        </div>
        <div className={styles.navRight}>
          {showSkip && onSkip && (
            <button 
              onClick={onSkip}
              className="btn-ghost"
            >
              Skip for now
            </button>
          )}
          {!isLastStep ? (
            <button 
              onClick={onNext}
              className="btn-primary"
              disabled={loading}
            >
              Continue →
            </button>
          ) : (
            <button 
              onClick={onSubmit}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function useWizard(steps: WizardStep[]) {
  const [currentStep, setCurrentStep] = useState(steps[0].key)
  
  const currentIndex = steps.findIndex(s => s.key === currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === steps.length - 1

  const goNext = () => {
    if (!isLastStep) {
      setCurrentStep(steps[currentIndex + 1].key)
    }
  }

  const goBack = () => {
    if (!isFirstStep) {
      setCurrentStep(steps[currentIndex - 1].key)
    }
  }

  return {
    currentStep,
    setCurrentStep,
    currentIndex,
    isFirstStep,
    isLastStep,
    goNext,
    goBack
  }
}
