import type { Metadata } from 'next'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'Products — XistrYmemZ',
  description: 'Shop community products — buy direct from makers and sellers near you.',
}

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
