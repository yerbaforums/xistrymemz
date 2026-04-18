export interface CryptoInfo {
  id: string
  symbol: string
  name: string
  icon: string
  color: string
}

const LOGO_URLS: Record<string, string> = {
  ETH: '/crypto-logos/ethereum.png',
  BTC: '/crypto-logos/bitcoin.png',
  USDT: '/crypto-logos/tether.png',
  USDC: '/crypto-logos/usd-coin.png',
  XMR: '/crypto-logos/monero.png',
  XTM: '/crypto-logos/tari.png',
  ARRR: '/crypto-logos/pirate-chain.png',
  DERO: '/crypto-logos/dero.png',
  ZANO: '/crypto-logos/zano.png',
}

export const CRYPTO_ICONS: Record<string, CryptoInfo> = {
  ETH: {
    id: 'ETH',
    symbol: 'ETH',
    name: 'Ethereum',
    icon: LOGO_URLS.ETH,
    color: '#627EEA'
  },
  BTC: {
    id: 'BTC',
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: LOGO_URLS.BTC,
    color: '#F7931A'
  },
  USDT: {
    id: 'USDT',
    symbol: 'USDT',
    name: 'Tether',
    icon: LOGO_URLS.USDT,
    color: '#26A17B'
  },
  USDC: {
    id: 'USDC',
    symbol: 'USDC',
    name: 'USD Coin',
    icon: LOGO_URLS.USDC,
    color: '#2775CA'
  },
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
  ARRR: {
    id: 'ARRR',
    symbol: 'ARRR',
    name: 'Pirate Chain',
    icon: LOGO_URLS.ARRR,
    color: '#000000'
  },
  DERO: {
    id: 'DERO',
    symbol: 'DERO',
    name: 'Dero',
    icon: LOGO_URLS.DERO,
    color: '#2F3854'
  },
  ZANO: {
    id: 'ZANO',
    symbol: 'ZANO',
    name: 'Zano',
    icon: LOGO_URLS.ZANO,
    color: '#4A90D9'
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