'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { Product } from '@/types/product'
import styles from './ProductQuickViewModal.module.css'

interface QuickViewModalProps {
  product: Product | null
  onClose: () => void
  onFund?: (product: Product) => void
}

export default function ProductQuickViewModal({ product, onClose, onFund }: QuickViewModalProps) {
  const { data: session } = useSession()
  const { addItem } = useCart()
  const { settings } = useSiteSettings()
  const isCartDisabled = !settings.enableCheckout
  const modalRef = useFocusTrap(!!product, onClose)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (product) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [product, handleKeyDown])

  if (!product) return null

  const priceDisplay = () => {
    if (product.type === 'RENTAL' && product.rentalDaily) {
      return (
        <div className={styles.rentalPrices}>
          <span className={styles.mainPrice}>${product.rentalDaily}<span className={styles.perUnit}>/day</span></span>
          <div className={styles.rentalRates}>
            {product.rentalWeekly && <span>${product.rentalWeekly}/wk</span>}
            {product.rentalMonthly && <span>${product.rentalMonthly}/mo</span>}
            {product.rentalDeposit && <span className={styles.deposit}>${product.rentalDeposit} deposit</span>}
          </div>
        </div>
      )
    }
    if (product.price != null) return <span className={styles.mainPrice}>${product.price}</span>
    return <span className={styles.mainPrice}>Free</span>
  }

  const paymentMethods = product.paymentMethods
    ? product.paymentMethods.split(',').filter(Boolean)
    : []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-lg`} onClick={e => e.stopPropagation()} ref={modalRef}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className={styles.layout}>
          <div className={styles.imageCol}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.title} className={styles.image} />
            ) : (
              <div className={styles.imagePlaceholder}>
                {product.type === 'SERVICE' ? '🔧' : product.type === 'RENTAL' ? '📆' : '📦'}
              </div>
            )}
          </div>

          <div className={styles.infoCol}>
            <div className={styles.badges}>
              {product.pinned && <span className={styles.pinBadge}>Featured</span>}
              <span className={`${styles.typeBadge} ${
                product.type === 'PRODUCT' ? styles.typeProd : product.type === 'RENTAL' ? styles.typeRent : styles.typeSvc
              }`}>{product.type}</span>
              {product.condition && (
                <span className={styles.condBadge}>{product.condition.replace('_', ' ')}</span>
              )}
            </div>

            <h2 className={styles.title}>{product.title}</h2>
            {priceDisplay()}

            <div className={styles.sellerRow}>
              <span>by <strong>{product.user.name || 'Unknown'}</strong></span>
              {product.user.shopSlug && (
                <Link href={`/shop/${product.user.shopSlug}`} className={styles.shopLink} onClick={(e) => e.stopPropagation()}>
                  Visit Shop →
                </Link>
              )}
            </div>

            <div className={styles.metaRow}>
              <span>{product.isGlobal ? '🌍 Ships worldwide' : `📍 ${product.location || 'Local pickup'}`}</span>
              {product.category && <span className={styles.catPill}>{product.category}</span>}
            </div>

            {paymentMethods.length > 0 && (
              <div className={styles.paymentRow}>
                <span>💳</span>
                {paymentMethods.map(m => (
                  <span key={m} className={styles.paymentPill}>{m.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <div className={styles.descSection}>
            <h3>Description</h3>
            <p className={styles.desc}>{product.description}</p>
          </div>
        )}

        <div className={styles.actions}>
          <Link href={`/products/${product.id}`} className={styles.primaryBtn} onClick={(e) => e.stopPropagation()}>
            View Full Details →
          </Link>
          <div className={styles.secondaryActions}>
            {product.price != null && (
              <button
                className={`${styles.actionBtn} ${isCartDisabled ? styles.disabled : ''}`}
                onClick={() => {
                  if (!isCartDisabled) addItem({ id: product.id, title: product.title, price: product.price || 0, imageUrl: product.imageUrl })
                }}
                disabled={isCartDisabled}
                title={isCartDisabled ? 'Cart coming soon' : 'Add to cart'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Add to Cart
              </button>
            )}
            {session?.user && onFund && (
              <button className={styles.actionBtnAlt} onClick={() => { onClose(); onFund(product) }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Fund
              </button>
            )}
            {session?.user && (
              <button className={styles.actionBtnAlt}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Message
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
