export interface CryptoPrice {
  symbol: string
  price: number
  change24h: number
}

export const PRICES: Record<string, number> = {
  ETH: 3450.00,
  BTC: 68500.00,
  USDT: 1.00,
  USDC: 1.00,
  XMR: 165.00,
  XTM: 0.008,
  ARRR: 0.18,
  DERO: 2.15,
  ZANO: 9.88
}

export async function getCryptoPrices(): Promise<CryptoPrice[]> {
  // In production, fetch from CoinGecko API
  // For now, return mock prices
  return Object.entries(PRICES).map(([symbol, price]) => ({
    symbol,
    price,
    change24h: Math.random() * 10 - 5 // -5% to +5%
  }))
}

export function getCryptoPrice(symbol: string): number {
  return PRICES[symbol.toUpperCase()] || 0
}

export function usdToCrypto(usdAmount: number, cryptoSymbol: string): number {
  const price = getCryptoPrice(cryptoSymbol)
  if (price === 0) return 0
  return usdAmount / price
}

export function cryptoToUsd(cryptoAmount: number, cryptoSymbol: string): number {
  const price = getCryptoPrice(cryptoSymbol)
  return cryptoAmount * price
}