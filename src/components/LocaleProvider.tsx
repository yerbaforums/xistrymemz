'use client'

import { NextIntlClientProvider } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const LOCALE_PATTERN = /^\/(en|es|fr|pt|it|ru|ar|de|hi|ja|zh|ko|nl|pl|sv|tr)(\/|$)/

function detectLocale(pathname: string): string {
  const match = pathname.match(LOCALE_PATTERN)
  return match ? match[1] : 'en'
}

export default function LocaleProvider({ children, initialLocale, initialMessages }: {
  children: React.ReactNode
  initialLocale: string
  initialMessages: any
}) {
  const pathname = usePathname()
  const [locale, setLocale] = useState(initialLocale)
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    const detected = detectLocale(pathname)
    if (detected !== locale) {
      setLocale(detected)
      import(`../../messages/${detected}.json`).then(m => setMessages(m.default))
    }
  }, [pathname])

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
