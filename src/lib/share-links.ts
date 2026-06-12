export interface SharePlatform {
  key: string
  label: string
  url: string
  icon: string
}

export const SOCIAL_PLATFORMS: SharePlatform[] = [
  { key: 'x', label: 'X', url: 'https://twitter.com/intent/tweet', icon: '/social-logos/twitter.svg' },
  { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/sharer/sharer.php', icon: '/social-logos/facebook.svg' },
  { key: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/sharing/share-offsite/', icon: '/social-logos/linkedin.svg' },
  { key: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/submit', icon: '/social-logos/reddit.svg' },
  { key: 'telegram', label: 'Telegram', url: 'https://t.me/share/url', icon: '/social-logos/telegram.svg' },
  { key: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/', icon: '/social-logos/whatsapp.svg' },
  { key: 'mastodon', label: 'Mastodon', url: 'https://s2f.kytta.dev/', icon: '/social-logos/mastodon.svg' },
  { key: 'email', label: 'Email', url: 'mailto:', icon: '/social-logos/email.svg' },
]

export function buildShareUrl(platform: SharePlatform, title: string, url: string): string {
  const encoded = {
    title: encodeURIComponent(title),
    url: encodeURIComponent(url),
  }

  switch (platform.key) {
    case 'x':
      return `${platform.url}?text=${encoded.title}&url=${encoded.url}`
    case 'facebook':
      return `${platform.url}?u=${encoded.url}`
    case 'linkedin':
      return `${platform.url}?url=${encoded.url}`
    case 'reddit':
      return `${platform.url}?url=${encoded.url}&title=${encoded.title}`
    case 'telegram':
      return `${platform.url}?url=${encoded.url}&text=${encoded.title}`
    case 'whatsapp':
      return `${platform.url}?text=${encodeURIComponent(title + ' ' + url)}`
    case 'mastodon':
      return `${platform.url}?text=${encoded.title}&url=${encoded.url}`
    case 'email':
      return `${platform.url}?subject=${encoded.title}&body=${encoded.url}`
    default:
      return url
  }
}
