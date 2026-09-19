import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { headers } from 'next/headers'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (typeof locale !== 'string' || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    const h = await headers()
    locale = h.get('x-next-intl-locale') || routing.defaultLocale
  }

  if (typeof locale !== 'string' || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})