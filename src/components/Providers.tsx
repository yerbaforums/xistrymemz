'use client'

import { SessionProvider } from 'next-auth/react'
import { CartProvider } from '@/context/CartContext'
import { ToastProvider } from '@/context/ToastContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CartProvider>
    </SessionProvider>
  )
}
