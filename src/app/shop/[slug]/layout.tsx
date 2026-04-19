import styles from '@/app/dashboard/layout.module.css'

export default async function ShopLayout({
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
