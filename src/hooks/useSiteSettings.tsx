'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SiteSettings {
  enableCheckout: boolean
  enableWallet: boolean
}

interface SiteSettingsContextType {
  settings: SiteSettings
  loading: boolean
}

const defaultSettings: SiteSettings = {
  enableCheckout: true,
  enableWallet: true
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: defaultSettings,
  loading: true
})

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/site-settings')
      .then(res => res.json())
      .then(data => {
        setSettings({
          enableCheckout: data.enableCheckout ?? true,
          enableWallet: data.enableWallet ?? true
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <SiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider')
  }
  return context
}