// Logo assets live in /public/crypto-logos. Every currency listed here must
// have a matching file, otherwise consumers fall back to a generic badge.
// Accounts in the wild still hold addresses for the slimmed-down coins
// (DERO, ARRR, FIRO), so they are mapped rather than hidden.
export const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'bitcoin.png',
  ETH: 'ethereum.png',
  USDT: 'tether.png',
  USDC: 'usd-coin.png',
  XMR: 'monero.png',
  XTM: 'tari.png',
  ZANO: 'zano.png',
  FUSD: 'freedom-dollar.png',
  DERO: 'dero.png',
  ARRR: 'pirate-chain.png',
  FIRO: 'firo.png',
}

// Human-readable names. Tickers alone ("FUSD", "XTM") mean nothing to someone
// choosing which rail to send on, so surfaces that ask a user to pick an
// address (e.g. /donate) show "Monero (XMR)" instead. Deliberately separate
// from CRYPTO_LOGOS: having a logo does not mean having a listed market.
export const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  USDC: 'USD Coin',
  XMR: 'Monero',
  XTM: 'Minotari',
  ZANO: 'Zano',
  FUSD: 'Freedom Dollar',
  DERO: 'Dero',
  ARRR: 'Pirate Chain',
  FIRO: 'Firo',
}
