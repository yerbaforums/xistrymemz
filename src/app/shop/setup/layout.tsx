import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import styles from './layout.module.css'

export default async function ShopSetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await getServerSession(authOptions)

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
