'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

// Heavy form tree (EventFormFields, ImageUploader, MentionInput, pickers…)
// loads on demand so the root layout stays lean.
const QuickCreateModalContent = dynamic(
  () => import('./QuickCreateForms'),
  { ssr: false },
)

export interface QuickCreatePrefill {
  title?: string
  name?: string
  description?: string
  price?: string
  category?: string
  duration?: string
  goalAmount?: string
  budget?: string
  deadline?: string
  volunteerRoles?: string
  lookingForCollaborators?: boolean
  needsVolunteers?: boolean
}

interface QuickCreateContextType {
  open: (tab?: string, prefill?: QuickCreatePrefill | null) => void
  close: () => void
}

const QuickCreateContext = createContext<QuickCreateContextType>({
  open: () => {},
  close: () => {},
})

export function useQuickCreate() {
  return useContext(QuickCreateContext)
}

export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState('post')
  const [prefill, setPrefill] = useState<QuickCreatePrefill | null>(null)

  const closeModal = () => {
    setIsOpen(false)
    setPrefill(null)
  }

  return (
    <QuickCreateContext.Provider value={{
      open: (t, p) => { setTab(t || 'post'); setPrefill(p || null); setIsOpen(true) },
      close: closeModal,
    }}>
      {children}
      {isOpen && (
        <QuickCreateModalContent
          open={isOpen}
          onClose={closeModal}
          initialTab={tab}
          onTabChange={setTab}
          prefill={prefill}
        />
      )}
    </QuickCreateContext.Provider>
  )
}
