// Logo assets live in /public/crypto-logos. Every currency listed here must
// have a matching file, otherwise consumers fall back to a generic badge.
// The supported rails are exactly the four below; legacy coins (BTC, ETH,
// USDT, USDC, DERO, ARRR, FIRO) were removed from the site, so any
// addresses still stored for them render with the generic badge and are
// hidden from platform-wide surfaces.
export const CRYPTO_LOGOS: Record<string, string> = {
  XMR: 'monero.png',
  XTM: 'tari.png',
  ZANO: 'zano.png',
  FUSD: 'freedom-dollar.png',
}

// Human-readable names. Tickers alone ("FUSD", "XTM") mean nothing to someone
// choosing which rail to send on, so surfaces that ask a user to pick an
// address (e.g. /donate) show "Monero (XMR)" instead. Deliberately separate
// from CRYPTO_LOGOS: having a logo does not mean having a listed market.
export const CRYPTO_NAMES: Record<string, string> = {
  XMR: 'Monero',
  XTM: 'Minotari',
  ZANO: 'Zano',
  FUSD: 'Freedom Dollar',
}

/**
 * The crypto rails the site supports. Single source of truth —
 * pickers, tip options, rate tables and API validation all
 * derive from this list.
 */
export const SUPPORTED_CRYPTOS = Object.keys(CRYPTO_NAMES)
