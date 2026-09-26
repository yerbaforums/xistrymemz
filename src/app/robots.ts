import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/admin/', '/messages'],
      },
    ],
    sitemap: 'https://xistrymemz.xyz/sitemap.xml',
  }
}
