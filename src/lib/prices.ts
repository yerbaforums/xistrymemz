export interface CryptoPrice {
  symbol: string
  price: number
  change24h: number
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  XMR: 'monero',
  XTM: 'minotari',
  ARRR: 'pirate-chain',
  DERO: 'dero',
  ZANO: 'zano',
  FIRO: 'firo',
}

const FALLBACK_PRICES: Record<string, number> = {
  BTC: 68500,
  ETH: 3450,
  USDT: 1,
  USDC: 1,
  XMR: 165,
  XTM: 0.06,
  ARRR: 3.50,
  DERO: 2.00,
  ZANO: 0.50,
  FIRO: 1.20,
}

const SYMBOLS = Object.keys(COINGECKO_IDS) as (keyof typeof COINGECKO_IDS)[]

let cache: { prices: Record<string, number>; changes: Record<string, number>; ts: number } | null = null
const CACHE_TTL = 60_000

async function fetchPrices(): Promise<void> {
  const ids = Object.values(COINGECKO_IDS).join(',')
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  )
  if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)
  const data: Record<string, { usd: number; usd_24h_change?: number }> = await res.json()

  const prices: Record<string, number> = {}
  const changes: Record<string, number> = {}
  for (const symbol of SYMBOLS) {
    const entry = data[COINGECKO_IDS[symbol]]
    if (entry?.usd != null) {
      prices[symbol] = entry.usd
      changes[symbol] = entry.usd_24h_change ?? 0
    }
  }

  for (const symbol of SYMBOLS) {
    if (prices[symbol] == null && FALLBACK_PRICES[symbol] != null) {
      prices[symbol] = FALLBACK_PRICES[symbol]
    }
  }

  cache = { prices, changes, ts: Date.now() }
}

function getCached(): { prices: Record<string, number>; changes: Record<string, number> } | null {
  if (!cache || Date.now() - cache.ts > CACHE_TTL) return null
  return { prices: cache.prices, changes: cache.changes }
}

export async function getCryptoPrices(): Promise<CryptoPrice[]> {
  let data = getCached()
  if (!data) {
    try {
      await fetchPrices()
      data = getCached()
    } catch {
      if (cache) data = { prices: cache.prices, changes: cache.changes }
      else data = { prices: { ...FALLBACK_PRICES }, changes: {} }
    }
  }
  return SYMBOLS.filter(s => data!.prices[s] != null).map(symbol => ({
    symbol,
    price: data!.prices[symbol],
    change24h: data!.changes[symbol] ?? 0,
  }))
}

export async function getCryptoPrice(symbol: string): Promise<number> {
  let data = getCached()
  if (!data) {
    try {
      await fetchPrices()
      data = getCached()
    } catch {
      if (cache) data = { prices: cache.prices, changes: cache.changes }
      else return 0
    }
  }
  return data!.prices[symbol.toUpperCase()] ?? 0
}

export async function usdToCrypto(usdAmount: number, cryptoSymbol: string): Promise<number> {
  const price = await getCryptoPrice(cryptoSymbol)
  if (price === 0) return 0
  return usdAmount / price
}

export async function cryptoToUsd(cryptoAmount: number, cryptoSymbol: string): Promise<number> {
  const price = await getCryptoPrice(cryptoSymbol)
  return cryptoAmount * price
}