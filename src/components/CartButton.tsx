'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import Link from 'next/link'
import styles from './CartButton.module.css'

export default function CartButton() {
  const { items, total, count, updateQuantity } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.cartWrapper}>
      <button className={styles.cartBtn} onClick={() => setOpen(!open)}>
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
              <Link href="/checkout" className={styles.checkoutBtn} onClick={() => setOpen(false)}>
                Checkout
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
