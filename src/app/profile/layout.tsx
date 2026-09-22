import styles from './layout.module.css'

// NOTE: no session guard here — /profile/[username] is a public shareable page
// (with OG metadata). Private children guard themselves: /profile/page.tsx and
// /profile/settings/page.tsx via getServerSession, /profile/edit via middleware.
export default async function ProfileLayout({
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
