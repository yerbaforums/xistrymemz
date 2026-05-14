'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import type { Product } from '@/types/product'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  viewMode?: 'grid' | 'list'
  onQuickView?: (product: Product) => void
  onFund?: (product: Product) => void
  isSelected?: boolean
  onSelect?: (product: Product | null) => void
  showOwnerActions?: boolean
  onEdit?: (product: Product) => void
  onTogglePublish?: (product: Product) => void
  onDelete?: (product: Product) => void
  onPin?: (product: Product) => void
}

export default function ProductCard({
  product,
  viewMode = 'grid',
  onQuickView,
  onFund,
  isSelected,
  onSelect,
  showOwnerActions,
  onEdit,
  onTogglePublish,
  onDelete,
  onPin,
}: ProductCardProps) {
  const { data: session } = useSession()
  const { addItem } = useCart()
  const { settings } = useSiteSettings()
  const isCartDisabled = !settings.enableCheckout

  const priceDisplay = () => {
    if (product.type === 'RENTAL' && product.rentalDaily) {
      return <>${product.rentalDaily}<span className={styles.perUnit}>/day</span></>
    }
    if (product.price != null) return <>${product.price}</>
    return 'Free'
  }

  const typeLabel = product.type === 'PRODUCT' ? 'PROD' : product.type === 'RENTAL' ? 'RENT' : 'SVC'

  return (
    <div
      className={`${styles.card} ${viewMode === 'list' ? styles.list : ''} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect?.(isSelected ? null : product)}
    >
      {product.imageUrl ? (
        <div className={styles.imageWrap}>
          <img src={product.imageUrl} alt={product.title} className={styles.image} loading="lazy" />
          <div className={styles.imageOverlay}>
            <button
              className={styles.qvBtn}
              onClick={(e) => { e.stopPropagation(); onQuickView?.(product) }}
              title="Quick view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.imageWrap}>
          <div className={styles.imagePlaceholder}>
            {product.type === 'SERVICE' ? '🔧' : product.type === 'RENTAL' ? '📆' : '📦'}
          </div>
          <div className={styles.imageOverlay}>
            <button
              className={styles.qvBtn}
              onClick={(e) => { e.stopPropagation(); onQuickView?.(product) }}
              title="Quick view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.header}>
          {product.pinned && <span className={styles.pinBadge}>Featured</span>}
          <span className={`${styles.typeBadge} ${
            product.type === 'PRODUCT' ? styles.typeProd : product.type === 'RENTAL' ? styles.typeRent : styles.typeSvc
          }`}>{typeLabel}</span>
          {product.condition && (
            <span className={styles.condBadge}>{product.condition.replace('_', ' ')}</span>
          )}
        </div>

        <Link href={`/products/${product.id}`} className={styles.titleLink} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.title}>{product.title}</h3>
        </Link>

        {viewMode === 'grid' && product.description && (
          <p className={styles.desc}>{product.description}</p>
        )}

        <div className={styles.meta}>
          <span>{product.isGlobal ? '🌍 Global' : `📍 ${product.location || 'Local'}`}</span>
          <span>by {product.user.name || 'Unknown'}</span>
        </div>

        {product.hashtags && product.hashtags.length > 0 && (
          <div className={styles.hashtags}>
            {product.hashtags.slice(0, 3).map(h => (
              <span key={h.tag} className={styles.hashtag}>#{h.tag}</span>
            ))}
          </div>
        )}

        {product.category && viewMode === 'list' && (
          <div className={styles.meta}>
            <span className={styles.catPill}>{product.category}</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.price}>{priceDisplay()}</span>
        <div className={styles.actions}>
          {onQuickView && (
            <button
              className={styles.actionIcon}
              onClick={(e) => { e.stopPropagation(); onQuickView(product) }}
              title="Quick view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
          )}
          <Link
            href={`/products/${product.id}`}
            className={styles.actionIcon}
            onClick={(e) => e.stopPropagation()}
            title="View details"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          {session?.user && onFund && (
            <button
              className={styles.actionIcon}
              onClick={(e) => { e.stopPropagation(); onFund(product) }}
              title="Request funding"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          )}
          {product.price != null && (
            <button
              className={`${styles.actionIcon} ${isCartDisabled ? styles.disabled : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                if (!isCartDisabled) addItem({ id: product.id, title: product.title, price: product.price || 0, imageUrl: product.imageUrl })
              }}
              disabled={isCartDisabled}
              title={isCartDisabled ? 'Cart coming soon' : 'Add to cart'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </button>
          )}
          {showOwnerActions && onEdit && (
            <button className={styles.actionIcon} onClick={(e) => { e.stopPropagation(); onEdit(product) }} title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {showOwnerActions && onTogglePublish && (
            <button className={styles.actionIcon} onClick={(e) => { e.stopPropagation(); onTogglePublish(product) }} title={product.published ? 'Hide' : 'Publish'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {product.published ? (
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                ) : (
                  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                )}
              </svg>
            </button>
          )}
          {showOwnerActions && onDelete && (
            <button className={`${styles.actionIcon} ${styles.danger}`} onClick={(e) => { e.stopPropagation(); onDelete(product) }} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
