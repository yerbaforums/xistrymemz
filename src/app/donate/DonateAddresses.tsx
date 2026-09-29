'use client'

import { useState } from 'react'
import styles from './page.module.css'
import { QRCodeModal } from '@/components/QRCodeModal'
import { DonationActions } from '@/components/DonationActions'
import { CRYPTO_LOGOS, CRYPTO_NAMES } from '@/lib/constants'
import { formatCryptoPrice } from '@/lib/funding'
import type { SiteDonationAddress } from '@/lib/site-donations'

interface DonateAddressesProps {
  addresses: SiteDonationAddress[]
  prices: Record<string, number>
}

/**
 * The only interactive part of /donate. Addresses and prices are fetched on the
 * server and passed in, so the actual rails are present in the served HTML —
 * a crawler, a link preview, or a visitor with JS disabled can still read and
 * copy an address. Only the copy button and QR modal need the client.
 */
export function DonateAddresses({ addresses, prices }: DonateAddressesProps) {
  const [qrOpen, setQrOpen] = useState<SiteDonationAddress | null>(null)

  if (addresses.length === 0) {
    return (
      <p className={styles.pending}>
        No donation addresses are configured right now. If you found this page
        from a link elsewhere, please check back shortly.
      </p>
    )
  }

  return (
    <>
      <div className={styles.donationList}>
        {addresses.map(da => {
          const price = formatCryptoPrice(prices[da.currency], da.currency)
          return (
            <div key={da.id} className={styles.donationItem}>
              <img
                src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`}
                alt=""
                width={26}
                height={26}
                aria-hidden="true"
              />
              <div className={styles.donationMeta}>
                <span className={styles.donationLabel}>
                  {CRYPTO_NAMES[da.currency] || da.label || da.currency}
                  <span className={styles.donationTicker}>{da.currency}</span>
                  {price && <span className={styles.donationPrice}>{` · ${price}`}</span>}
                </span>
                <code className={styles.donationAddr} title={da.address}>{da.address}</code>
              </div>
              <DonationActions
                address={da.address}
                onQrClick={da.showQR ? () => setQrOpen(da) : undefined}
                size="md"
              />
            </div>
          )
        })}
      </div>

      {qrOpen && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrOpen(null)}
          currency={CRYPTO_NAMES[qrOpen.currency] || qrOpen.label || qrOpen.currency}
          address={qrOpen.address}
        />
      )}
    </>
  )
}
