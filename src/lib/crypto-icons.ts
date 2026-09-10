export interface CryptoInfo {
  id: string
  symbol: string
  name: string
  icon: string
  color: string
}

const LOGO_URLS: Record<string, string> = {
  XMR: '/crypto-logos/monero.png',
  XTM: '/crypto-logos/tari.png',
  ZANO: '/crypto-logos/zano.png',
  FUSD: '/crypto-logos/freedom-dollar.png',
}

export const CRYPTO_ICONS: Record<string, CryptoInfo> = {
  XMR: {
    id: 'XMR',
    symbol: 'XMR',
    name: 'Monero',
    icon: LOGO_URLS.XMR,
    color: '#FF6600'
  },
  XTM: {
    id: 'XTM',
    symbol: 'XTM',
    name: 'Tari',
    icon: LOGO_URLS.XTM,
    color: '#8B5CF6'
  },
  ZANO: {
    id: 'ZANO',
    symbol: 'ZANO',
    name: 'Zano',
    icon: LOGO_URLS.ZANO,
    color: '#4A90D9'
  },
  FUSD: {
    id: 'FUSD',
    symbol: 'FUSD',
    name: 'Freedom Dollar',
    icon: LOGO_URLS.FUSD,
    color: '#22A06B'
  }
}

export function getCryptoIcon(symbol: string): string {
  return CRYPTO_ICONS[symbol.toUpperCase()]?.icon || ''
}

export function getCryptoName(symbol: string): string {
  return CRYPTO_ICONS[symbol.toUpperCase()]?.name || symbol
}

export function getCryptoColor(symbol: string): string {
  return CRYPTO_ICONS[symbol.toUpperCase()]?.color || '#888888'
}

export function getCryptoInfo(symbol: string): CryptoInfo | undefined {
  return CRYPTO_ICONS[symbol.toUpperCase()]
}

export function getAllCryptos(): CryptoInfo[] {
  return Object.values(CRYPTO_ICONS)
}