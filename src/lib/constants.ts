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
