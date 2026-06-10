import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'fr', 'pt', 'it', 'ru', 'ar', 'de', 'hi', 'ja', 'zh', 'ko', 'nl', 'pl', 'sv', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
