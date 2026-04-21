'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import Link from 'next/link'
import styles from './CartButton.module.css'

export default function CartButton() {
  const { items, total, count, updateQuantity } = useCart()
  const { settings } = useSiteSettings()
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.cartWrapper}>
      <button 
        className={`${styles.cartBtn} ${!settings.enableCheckout ? styles.disabled : ''}`} 
        onClick={() => settings.enableCheckout && setOpen(!open)}
        disabled={!settings.enableCheckout}
        title={!settings.enableCheckout ? 'Checkout coming soon' : undefined}
      >
        🛒 Cart ({count})
      </button>
      {open && (
        <div className={styles.dropdown}>
          {items.length === 0 ? (
            <div className={styles.empty}>Cart is empty</div>
          ) : (
            <>
              {items.map(item => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemPrice}>${item.price}</span>
                  </div>
                  <div className={styles.itemQty}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
              ))}
              <div className={styles.total}>
                Total: ${total.toFixed(2)}
              </div>
              {settings.enableCheckout ? (
                <Link href="/checkout" className={styles.checkoutBtn} onClick={() => setOpen(false)}>
                  Checkout
                </Link>
              ) : (
                <span className={`${styles.checkoutBtn} ${styles.disabled}`}>
                  Coming Soon
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
