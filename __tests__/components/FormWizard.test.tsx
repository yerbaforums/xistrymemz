/// <reference types="jest" />
/// <reference types="react" />

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FormWizard, { useWizard } from '@/components/FormWizard'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: jest.fn() })
}))

const mockSteps = [
  { key: 'step1', label: 'Step 1', icon: '1' },
  { key: 'step2', label: 'Step 2', icon: '2' },
  { key: 'step3', label: 'Step 3', icon: '3' }
]

describe('FormWizard', () => {
  it('renders all steps', () => {
    render(
      <FormWizard
        steps={mockSteps}
        currentStep="step1"
        onStepChange={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
        onSubmit={jest.fn()}
        isFirstStep={true}
        isLastStep={false}
      >
        <div>Step Content</div>
      </FormWizard>
    )
    
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(screen.getByText('Step 3')).toBeInTheDocument()
  })

  it('shows progress bar', () => {
    render(
      <FormWizard
        steps={mockSteps}
        currentStep="step2"
        onStepChange={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
        onSubmit={jest.fn()}
        isFirstStep={false}
        isLastStep={false}
      >
        <div>Step Content</div>
      </FormWizard>
    )
    
    const progressBar = document.querySelector('[class*="progressFill"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <FormWizard
        steps={mockSteps}
        currentStep="step1"
        onStepChange={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
        onSubmit={jest.fn()}
        isFirstStep={true}
        isLastStep={false}
      >
        <div>Test Content</div>
      </FormWizard>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})

describe('useWizard', () => {
  it('initializes with first step', () => {
    const TestComponent = () => {
      const { currentStep, isFirstStep, isLastStep } = useWizard(mockSteps)
      return (
        <div>
          <span>{currentStep}</span>
          <span>{isFirstStep ? 'first' : 'not-first'}</span>
          <span>{isLastStep ? 'last' : 'not-last'}</span>
        </div>
      )
    }
    
    render(<TestComponent />)
    expect(screen.getByText('step1')).toBeInTheDocument()
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.getByText('not-last')).toBeInTheDocument()
  })
})
